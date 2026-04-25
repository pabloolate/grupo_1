package cl.duoc.grupo1.ms_reclamos.service;

import cl.duoc.grupo1.ms_reclamos.dto.*;
import cl.duoc.grupo1.ms_reclamos.model.*;
import cl.duoc.grupo1.ms_reclamos.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import cl.duoc.grupo1.ms_reclamos.repository.UsuarioRepository;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReclamoService {

    private final ReclamoRepository reclamoRepository;
    private final EstadoReclamoRepository estadoReclamoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ReclamoHistorialRepository reclamoHistorialRepository;
    private final ReclamoComentarioRepository reclamoComentarioRepository;
    private final ReclamoClasificacionIaRepository reclamoClasificacionIaRepository;

    @Transactional(readOnly = true)
    public List<ReclamoResumenResponse> listarReclamos() {
        return reclamoRepository.findAll(Sort.by(Sort.Direction.DESC, "fechaCreacion"))
            .stream()
            .map(this::mapearResumen)
            .toList();
    }

    @Transactional(readOnly = true)
    public ReclamoDetalleResponse obtenerDetalle(Long id) {
        Reclamo reclamo = obtenerReclamo(id);
        ReclamoClasificacionIaResponse ultimaClasificacion = reclamoClasificacionIaRepository
            .findFirstByReclamoIdOrderByFechaClasificacionDesc(id)
            .map(this::mapearClasificacion)
            .orElse(null);

        return mapearDetalle(reclamo, ultimaClasificacion);
    }

    @Transactional(readOnly = true)
    public List<ReclamoHistorialResponse> obtenerHistorial(Long id) {
        validarReclamoExiste(id);
        return reclamoHistorialRepository.findByReclamoIdOrderByFechaCreacionDesc(id)
            .stream()
            .map(this::mapearHistorial)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ReclamoComentarioResponse> obtenerComentarios(Long id) {
        validarReclamoExiste(id);
        return reclamoComentarioRepository.findByReclamoIdOrderByFechaCreacionAsc(id)
            .stream()
            .map(this::mapearComentario)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ReclamoClasificacionIaResponse> obtenerClasificacionesIa(Long id) {
        validarReclamoExiste(id);
        return reclamoClasificacionIaRepository.findByReclamoIdOrderByFechaClasificacionDesc(id)
            .stream()
            .map(this::mapearClasificacion)
            .toList();
    }

    @Transactional
    public ReclamoDetalleResponse cambiarEstado(Long id, CambiarEstadoRequest request) {
        Reclamo reclamo = obtenerReclamo(id);
        EstadoReclamo estadoAnterior = reclamo.getEstado();
        EstadoReclamo estadoNuevo = estadoReclamoRepository.findByNombreIgnoreCase(request.estado())
            .orElseThrow(() -> new EntityNotFoundException("No existe el estado: " + request.estado()));

        Usuario usuario = obtenerUsuarioOpcional(request.usuarioId());

        reclamo.setEstado(estadoNuevo);
        reclamo.setFechaActualizacion(LocalDateTime.now());

        if (Boolean.TRUE.equals(estadoNuevo.getEsEstadoFinal()) && reclamo.getFechaCierre() == null) {
            reclamo.setFechaCierre(LocalDateTime.now());
        }

        Reclamo actualizado = reclamoRepository.save(reclamo);

        guardarHistorial(
            actualizado,
            usuario,
            estadoAnterior,
            estadoNuevo,
            reclamo.getPrioridad(),
            reclamo.getPrioridad(),
            "CAMBIO_ESTADO",
            request.observacion() != null ? request.observacion() : "Cambio de estado realizado desde ms-reclamos."
        );

        return obtenerDetalle(actualizado.getId());
    }

    @Transactional
    public ReclamoDetalleResponse asignarReclamo(Long id, AsignarReclamoRequest request) {
        Reclamo reclamo = obtenerReclamo(id);
        Usuario usuario = usuarioRepository.findById(request.usuarioId())
            .orElseThrow(() -> new EntityNotFoundException("No existe el usuario id: " + request.usuarioId()));

        reclamo.setUsuarioAsignado(usuario);
        reclamo.setFechaActualizacion(LocalDateTime.now());

        Reclamo actualizado = reclamoRepository.save(reclamo);

        guardarHistorial(
            actualizado,
            usuario,
            reclamo.getEstado(),
            reclamo.getEstado(),
            reclamo.getPrioridad(),
            reclamo.getPrioridad(),
            "ASIGNACION",
            request.observacion() != null ? request.observacion() : "Reclamo asignado a " + usuario.getNombre() + "."
        );

        return obtenerDetalle(actualizado.getId());
    }

    @Transactional
    public ReclamoComentarioResponse agregarComentario(Long id, CrearComentarioRequest request) {
        Reclamo reclamo = obtenerReclamo(id);
        Usuario usuario = obtenerUsuarioOpcional(request.usuarioId());

        ReclamoComentario comentario = new ReclamoComentario();
        comentario.setReclamo(reclamo);
        comentario.setUsuario(usuario);
        comentario.setComentario(request.comentario());
        comentario.setEsInterno(request.esInterno() == null || request.esInterno());
        comentario.setFechaCreacion(LocalDateTime.now());
        comentario.setFechaActualizacion(LocalDateTime.now());

        ReclamoComentario guardado = reclamoComentarioRepository.save(comentario);

        guardarHistorial(
            reclamo,
            usuario,
            reclamo.getEstado(),
            reclamo.getEstado(),
            reclamo.getPrioridad(),
            reclamo.getPrioridad(),
            "COMENTARIO",
            "Se agregó un comentario al reclamo."
        );

        return mapearComentario(guardado);
    }

    private Reclamo obtenerReclamo(Long id) {
        return reclamoRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("No existe el reclamo id: " + id));
    }

    private void validarReclamoExiste(Long id) {
        if (!reclamoRepository.existsById(id)) {
            throw new EntityNotFoundException("No existe el reclamo id: " + id);
        }
    }

    private Usuario obtenerUsuarioOpcional(Long usuarioId) {
        if (usuarioId == null) {
            return null;
        }

        return usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new EntityNotFoundException("No existe el usuario id: " + usuarioId));
    }

    private void guardarHistorial(
        Reclamo reclamo,
        Usuario usuario,
        EstadoReclamo estadoAnterior,
        EstadoReclamo estadoNuevo,
        PrioridadReclamo prioridadAnterior,
        PrioridadReclamo prioridadNueva,
        String accion,
        String observacion
    ) {
        ReclamoHistorial historial = new ReclamoHistorial();
        historial.setReclamo(reclamo);
        historial.setUsuario(usuario);
        historial.setEstadoAnterior(estadoAnterior);
        historial.setEstadoNuevo(estadoNuevo);
        historial.setPrioridadAnterior(prioridadAnterior);
        historial.setPrioridadNueva(prioridadNueva);
        historial.setAccion(accion);
        historial.setObservacion(observacion);
        historial.setFechaCreacion(LocalDateTime.now());
        historial.setFechaActualizacion(LocalDateTime.now());

        reclamoHistorialRepository.save(historial);
    }

    private ReclamoResumenResponse mapearResumen(Reclamo reclamo) {
        return new ReclamoResumenResponse(
            reclamo.getId(),
            reclamo.getCodigoReclamo(),
            reclamo.getNombreCliente(),
            reclamo.getCorreoCliente(),
            reclamo.getAsunto(),
            nombreSeguro(reclamo.getCanal()),
            nombreSeguro(reclamo.getCategoria()),
            nombreSeguro(reclamo.getPrioridad()),
            nombreSeguro(reclamo.getEstado()),
            reclamo.getUsuarioAsignado() != null ? reclamo.getUsuarioAsignado().getId() : null,
            reclamo.getUsuarioAsignado() != null ? reclamo.getUsuarioAsignado().getNombre() : null,
            reclamo.getRequiereAtencionHumana(),
            reclamo.getFechaCreacion(),
            reclamo.getFechaActualizacion(),
            reclamo.getFechaCierre()
        );
    }

    private ReclamoDetalleResponse mapearDetalle(Reclamo reclamo, ReclamoClasificacionIaResponse ultimaClasificacion) {
        return new ReclamoDetalleResponse(
            reclamo.getId(),
            reclamo.getCodigoReclamo(),
            reclamo.getReclamoEntranteId(),
            reclamo.getNombreCliente(),
            reclamo.getCorreoCliente(),
            reclamo.getAsunto(),
            reclamo.getDescripcion(),
            nombreSeguro(reclamo.getCanal()),
            nombreSeguro(reclamo.getCategoria()),
            nombreSeguro(reclamo.getPrioridad()),
            nombreSeguro(reclamo.getEstado()),
            reclamo.getUsuarioAsignado() != null ? reclamo.getUsuarioAsignado().getId() : null,
            reclamo.getUsuarioAsignado() != null ? reclamo.getUsuarioAsignado().getNombre() : null,
            reclamo.getRequiereAtencionHumana(),
            reclamo.getFechaPrimeraRespuesta(),
            reclamo.getFechaCreacion(),
            reclamo.getFechaActualizacion(),
            reclamo.getFechaCierre(),
            ultimaClasificacion
        );
    }

    private ReclamoHistorialResponse mapearHistorial(ReclamoHistorial historial) {
        return new ReclamoHistorialResponse(
            historial.getId(),
            historial.getUsuario() != null ? historial.getUsuario().getNombre() : null,
            nombreSeguro(historial.getEstadoAnterior()),
            nombreSeguro(historial.getEstadoNuevo()),
            nombreSeguro(historial.getPrioridadAnterior()),
            nombreSeguro(historial.getPrioridadNueva()),
            historial.getAccion(),
            historial.getObservacion(),
            historial.getFechaCreacion()
        );
    }

    private ReclamoComentarioResponse mapearComentario(ReclamoComentario comentario) {
        return new ReclamoComentarioResponse(
            comentario.getId(),
            comentario.getUsuario() != null ? comentario.getUsuario().getId() : null,
            comentario.getUsuario() != null ? comentario.getUsuario().getNombre() : null,
            comentario.getComentario(),
            comentario.getEsInterno(),
            comentario.getFechaCreacion()
        );
    }

    private ReclamoClasificacionIaResponse mapearClasificacion(ReclamoClasificacionIa clasificacion) {
        return new ReclamoClasificacionIaResponse(
            clasificacion.getId(),
            clasificacion.getCategoriaSugerida(),
            clasificacion.getPrioridadSugerida(),
            clasificacion.getPolaridad(),
            clasificacion.getResumen(),
            clasificacion.getRespuestaSugerida(),
            clasificacion.getConfianza(),
            clasificacion.getModeloUsado(),
            clasificacion.getRequiereRevisionHumana(),
            clasificacion.getFechaClasificacion()
        );
    }

    private String nombreSeguro(Object entidad) {
        if (entidad == null) {
            return null;
        }

        if (entidad instanceof Canal canal) {
            return canal.getNombre();
        }

        if (entidad instanceof CategoriaReclamo categoria) {
            return categoria.getNombre();
        }

        if (entidad instanceof PrioridadReclamo prioridad) {
            return prioridad.getNombre();
        }

        if (entidad instanceof EstadoReclamo estado) {
            return estado.getNombre();
        }

        return null;
    }
}
