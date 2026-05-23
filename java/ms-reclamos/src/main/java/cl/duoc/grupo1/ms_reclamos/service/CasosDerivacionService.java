package cl.duoc.grupo1.ms_reclamos.service;

import cl.duoc.grupo1.ms_reclamos.dto.*;
import cl.duoc.grupo1.ms_reclamos.repository.CasosDerivacionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class CasosDerivacionService {

    private static final List<String> ESTADOS_PERMITIDOS = List.of(
            "ABIERTO", "DERIVADO", "EN_GESTION", "ESCALADO", "CERRADO", "DESCARTADO", "ERROR"
    );

    private final CasosDerivacionRepository casosDerivacionRepository;

    public CasosDerivacionService(CasosDerivacionRepository casosDerivacionRepository) {
        this.casosDerivacionRepository = casosDerivacionRepository;
    }

    public List<CasoDerivacionResumenResponse> listarCasos(String estado, String area, String prioridad, String tipo, String usuario) {
        return casosDerivacionRepository.listarCasos(normalizarNullable(estado), normalizarNullable(area), normalizarNullable(prioridad), normalizarNullable(tipo), usuario);
    }

    public CasoDerivacionDetalleResponse obtenerDetalle(Long id) {
        return new CasoDerivacionDetalleResponse(
                casosDerivacionRepository.obtenerCaso(id),
                casosDerivacionRepository.obtenerComentariosCaso(id)
        );
    }

    public List<ComentarioCasoDerivacionResponse> obtenerComentarios(Long id) {
        return casosDerivacionRepository.obtenerComentariosCaso(id);
    }

    public List<CatalogoTipoIncidenciaResponse> listarCatalogoTipos() {
        return casosDerivacionRepository.listarCatalogoTipos();
    }

    public CasoDerivacionResumenResponse cambiarEstado(Long id, CambiarEstadoCasoRequest request) {
        String estado = normalizar(request.estadoCaso());
        if (!ESTADOS_PERMITIDOS.contains(estado)) {
            throw new IllegalArgumentException("Estado de caso no permitido: " + request.estadoCaso());
        }
        return casosDerivacionRepository.cambiarEstado(id, estado);
    }

    public CasoDerivacionResumenResponse asignarCaso(Long id, AsignarCasoRequest request) {
        return casosDerivacionRepository.asignarCaso(id, request.usuarioAsignadoId());
    }

    public List<UsuarioReclamanteResumenResponse> listarUsuariosReclamantes(String estado) {
        return casosDerivacionRepository.listarUsuariosReclamantes(normalizarNullable(estado));
    }

    public List<CasoDerivacionResumenResponse> listarCasosPorUsuario(String usuario) {
        return casosDerivacionRepository.listarCasosPorUsuario(usuario);
    }

    private String normalizarNullable(String valor) {
        if (valor == null || valor.trim().isEmpty()) return null;
        return normalizar(valor);
    }

    private String normalizar(String valor) {
        return String.valueOf(valor).trim().toUpperCase(Locale.ROOT);
    }
}
