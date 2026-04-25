package cl.duoc.grupo1.ms_integracion_multicanal.service;

import cl.duoc.grupo1.ms_integracion_multicanal.dto.CanalResponse;
import cl.duoc.grupo1.ms_integracion_multicanal.dto.CrearReclamoRequest;
import cl.duoc.grupo1.ms_integracion_multicanal.dto.ReclamoCreadoResponse;
import cl.duoc.grupo1.ms_integracion_multicanal.dto.ReclamoEntranteResponse;
import cl.duoc.grupo1.ms_integracion_multicanal.model.*;
import cl.duoc.grupo1.ms_integracion_multicanal.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class IntegracionService {

    private final CanalRepository canalRepository;
    private final ReclamoEntranteRepository reclamoEntranteRepository;
    private final ReclamoRepository reclamoRepository;
    private final CategoriaReclamoRepository categoriaReclamoRepository;
    private final PrioridadReclamoRepository prioridadReclamoRepository;
    private final EstadoReclamoRepository estadoReclamoRepository;

    public IntegracionService(
            CanalRepository canalRepository,
            ReclamoEntranteRepository reclamoEntranteRepository,
            ReclamoRepository reclamoRepository,
            CategoriaReclamoRepository categoriaReclamoRepository,
            PrioridadReclamoRepository prioridadReclamoRepository,
            EstadoReclamoRepository estadoReclamoRepository
    ) {
        this.canalRepository = canalRepository;
        this.reclamoEntranteRepository = reclamoEntranteRepository;
        this.reclamoRepository = reclamoRepository;
        this.categoriaReclamoRepository = categoriaReclamoRepository;
        this.prioridadReclamoRepository = prioridadReclamoRepository;
        this.estadoReclamoRepository = estadoReclamoRepository;
    }

    @Transactional(readOnly = true)
    public List<CanalResponse> listarCanales() {
        return canalRepository.findByActivoTrueOrderByNombreAsc()
                .stream()
                .map(canal -> new CanalResponse(
                        canal.getId(),
                        canal.getNombre(),
                        canal.getDescripcion(),
                        canal.getActivo()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReclamoEntranteResponse> listarEntrantes() {
        return reclamoEntranteRepository.findTop50ByOrderByIdDesc()
                .stream()
                .map(this::mapearEntrante)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReclamoEntranteResponse obtenerEntrante(Long id) {
        ReclamoEntrante entrante = reclamoEntranteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No existe reclamo entrante con id " + id));

        return mapearEntrante(entrante);
    }

    @Transactional
    public ReclamoCreadoResponse recibirFormulario(CrearReclamoRequest request) {
        return crearDesdeCanal(request, "FORMULARIO_WEB");
    }

    @Transactional
    public ReclamoCreadoResponse recibirCorreo(CrearReclamoRequest request) {
        return crearDesdeCanal(request, "CORREO");
    }

    @Transactional
    public ReclamoCreadoResponse recibirManual(CrearReclamoRequest request) {
        String canal = normalizarCanal(request.getCanalOrigen(), "OTRO");
        return crearDesdeCanal(request, canal);
    }

    @Transactional
    public ReclamoCreadoResponse recibirRedSocial(CrearReclamoRequest request) {
        String canal = normalizarCanal(request.getCanalOrigen(), "INSTAGRAM");
        return crearDesdeCanal(request, canal);
    }

    private ReclamoCreadoResponse crearDesdeCanal(CrearReclamoRequest request, String nombreCanal) {
        Canal canal = obtenerCanal(nombreCanal);

        ReclamoEntrante entrante = new ReclamoEntrante();
        entrante.setCanal(canal);
        entrante.setIdentificadorExterno(generarIdentificadorExterno(request));
        entrante.setNombreCliente(limpiar(request.getNombreCliente()));
        entrante.setCorreoCliente(limpiar(request.getCorreoCliente()));
        entrante.setAsunto(limpiar(request.getAsunto()));
        entrante.setMensaje(limpiar(request.getMensaje()));
        entrante.setEstadoIntegracion("NORMALIZADO");
        entrante.setFechaProcesamiento(LocalDateTime.now());

        ReclamoEntrante entranteGuardado = reclamoEntranteRepository.save(entrante);

        Reclamo reclamo = new Reclamo();
        reclamo.setCodigoReclamo(generarCodigoReclamo());
        reclamo.setCanal(canal);
        reclamo.setReclamoEntrante(entranteGuardado);
        reclamo.setNombreCliente(entranteGuardado.getNombreCliente());
        reclamo.setCorreoCliente(entranteGuardado.getCorreoCliente());
        reclamo.setAsunto(entranteGuardado.getAsunto());
        reclamo.setDescripcion(entranteGuardado.getMensaje());
        reclamo.setCategoria(obtenerCategoria("OTRO"));
        reclamo.setPrioridad(obtenerPrioridad("MEDIA"));
        reclamo.setEstado(obtenerEstado("RECIBIDO"));
        reclamo.setRequiereAtencionHumana(true);

        Reclamo reclamoGuardado = reclamoRepository.save(reclamo);

        entranteGuardado.setEstadoIntegracion("ENVIADO_A_RECLAMOS");
        entranteGuardado.setFechaProcesamiento(LocalDateTime.now());
        reclamoEntranteRepository.save(entranteGuardado);

        return new ReclamoCreadoResponse(
                entranteGuardado.getId(),
                reclamoGuardado.getId(),
                reclamoGuardado.getCodigoReclamo(),
                canal.getNombre(),
                entranteGuardado.getEstadoIntegracion(),
                reclamoGuardado.getEstado().getNombre(),
                "Reclamo recibido y creado correctamente"
        );
    }

    private ReclamoEntranteResponse mapearEntrante(ReclamoEntrante entrante) {
        return new ReclamoEntranteResponse(
                entrante.getId(),
                entrante.getCanal() != null ? entrante.getCanal().getNombre() : null,
                entrante.getIdentificadorExterno(),
                entrante.getNombreCliente(),
                entrante.getCorreoCliente(),
                entrante.getAsunto(),
                entrante.getMensaje(),
                entrante.getEstadoIntegracion(),
                entrante.getFechaRecepcion()
        );
    }

    private Canal obtenerCanal(String nombre) {
        return canalRepository.findByNombre(nombre)
                .orElseThrow(() -> new IllegalStateException("No existe canal base: " + nombre));
    }

    private CategoriaReclamo obtenerCategoria(String nombre) {
        return categoriaReclamoRepository.findByNombre(nombre)
                .orElseThrow(() -> new IllegalStateException("No existe categoria base: " + nombre));
    }

    private PrioridadReclamo obtenerPrioridad(String nombre) {
        return prioridadReclamoRepository.findByNombre(nombre)
                .orElseThrow(() -> new IllegalStateException("No existe prioridad base: " + nombre));
    }

    private EstadoReclamo obtenerEstado(String nombre) {
        return estadoReclamoRepository.findByNombre(nombre)
                .orElseThrow(() -> new IllegalStateException("No existe estado base: " + nombre));
    }

    private String normalizarCanal(String canalOrigen, String canalPorDefecto) {
        if (canalOrigen == null || canalOrigen.isBlank()) {
            return canalPorDefecto;
        }

        String canal = canalOrigen.trim().toUpperCase();

        return switch (canal) {
            case "INSTAGRAM", "TIKTOK", "FACEBOOK", "WHATSAPP", "CORREO", "FORMULARIO_WEB", "OTRO" -> canal;
            default -> canalPorDefecto;
        };
    }

    private String generarIdentificadorExterno(CrearReclamoRequest request) {
        if (request.getIdentificadorExterno() != null && !request.getIdentificadorExterno().isBlank()) {
            return request.getIdentificadorExterno().trim();
        }

        return "manual-" + System.currentTimeMillis();
    }

    private String generarCodigoReclamo() {
        String fecha = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        long sufijo = Math.abs(System.nanoTime() % 10000);
        return "REC-" + fecha + "-" + sufijo;
    }

    private String limpiar(String valor) {
        return valor == null ? null : valor.trim();
    }
}
