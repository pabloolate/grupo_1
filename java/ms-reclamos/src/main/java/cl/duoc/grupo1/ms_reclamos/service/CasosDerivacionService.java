package cl.duoc.grupo1.ms_reclamos.service;

import cl.duoc.grupo1.ms_reclamos.dto.*;
import cl.duoc.grupo1.ms_reclamos.repository.CasosDerivacionRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class CasosDerivacionService {

    private static final ZoneId ZONA_NEGOCIO = ZoneId.of("America/Santiago");

    private static final List<String> ESTADOS_PERMITIDOS = List.of(
            "ABIERTO", "DERIVADO", "EN_GESTION", "ESCALADO", "CERRADO", "DESCARTADO", "ERROR"
    );

    private static final List<String> ESTADOS_TIEMPO_PERMITIDOS = List.of(
            "NUEVO", "EN_PLAZO", "PROXIMO_A_VENCER", "VENCIDO", "CRITICO"
    );

    private final CasosDerivacionRepository casosDerivacionRepository;

    public CasosDerivacionService(CasosDerivacionRepository casosDerivacionRepository) {
        this.casosDerivacionRepository = casosDerivacionRepository;
    }

    public List<CasoDerivacionResumenResponse> listarCasos(String estado, String area, String prioridad, String tipo, String usuario) {
        return casosDerivacionRepository.listarCasos(
                normalizarNullable(estado),
                normalizarNullable(area),
                normalizarNullable(prioridad),
                normalizarNullable(tipo),
                usuario
        );
    }

    public List<CasoDerivacionFiltroFechaResponse> listarCasosPorFiltroFechas(
            String estadoTiempo,
            String desde,
            String hasta,
            String plataforma,
            String area,
            String prioridad,
            String tipo,
            String usuario
    ) {
        String estadoTiempoNormalizado = normalizarEstadoTiempoNullable(estadoTiempo);
        validarFechaNullable(desde, "desde");
        validarFechaNullable(hasta, "hasta");

        LocalDate hoy = LocalDate.now(ZONA_NEGOCIO);

        return casosDerivacionRepository.listarCasosParaFiltroFechas(
                        vacioANull(desde),
                        vacioANull(hasta),
                        normalizarPlataformaNullable(plataforma),
                        normalizarNullable(area),
                        normalizarNullable(prioridad),
                        normalizarNullable(tipo),
                        usuario
                )
                .stream()
                .map(caso -> completarEstadoTemporal(caso, hoy))
                .filter(caso -> estadoTiempoNormalizado == null || caso.estadoTiempo().equals(estadoTiempoNormalizado))
                .sorted(Comparator
                        .comparingInt((CasoDerivacionFiltroFechaResponse caso) -> prioridadEstadoTiempo(caso.estadoTiempo()))
                        .thenComparing(CasoDerivacionFiltroFechaResponse::diasHabilesTranscurridos, Comparator.reverseOrder())
                        .thenComparing(CasoDerivacionFiltroFechaResponse::fechaPrimerEvento))
                .toList();
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

    private CasoDerivacionFiltroFechaResponse completarEstadoTemporal(CasoDerivacionFiltroFechaResponse caso, LocalDate hoy) {
        if (caso.fechaPrimerEvento() == null) {
            throw new IllegalStateException("Caso " + caso.id() + " no trae fecha_primer_evento.");
        }

        LocalDate fechaPrimerEvento = caso.fechaPrimerEvento().atZoneSameInstant(ZONA_NEGOCIO).toLocalDate();
        int diasHabiles = calcularDiasHabilesTranscurridos(fechaPrimerEvento, hoy, caso.id());
        String estadoTiempo = resolverEstadoTiempo(diasHabiles, caso.prioridad(), caso.cantidadEventos());

        return new CasoDerivacionFiltroFechaResponse(
                caso.id(),
                caso.usuarioComentario(),
                caso.tipoIncidencia(),
                caso.areaDerivacion(),
                caso.prioridad(),
                caso.estadoCaso(),
                caso.cantidadEventos(),
                caso.reclamoEntranteIdGenerado(),
                caso.reclamoIdGenerado(),
                caso.codigoReclamo(),
                caso.clasificacionIdGenerada(),
                caso.usuarioAsignadoId(),
                caso.motivoDecision(),
                caso.confianza(),
                caso.fechaPrimerEvento(),
                caso.fechaUltimoEvento(),
                diasHabiles,
                estadoTiempo,
                caso.plataforma(),
                caso.urlPublicacion(),
                caso.textoResumen()
        );
    }

    private int calcularDiasHabilesTranscurridos(LocalDate fechaPrimerEvento, LocalDate hoy, Long casoId) {
        if (fechaPrimerEvento.isAfter(hoy)) {
            throw new IllegalStateException("Caso " + casoId + " tiene fecha_primer_evento futura: " + fechaPrimerEvento);
        }

        int dias = 0;
        LocalDate cursor = fechaPrimerEvento.plusDays(1);

        while (!cursor.isAfter(hoy)) {
            if (esDiaHabil(cursor)) {
                dias++;
            }
            cursor = cursor.plusDays(1);
        }

        return dias;
    }

    private boolean esDiaHabil(LocalDate fecha) {
        DayOfWeek dia = fecha.getDayOfWeek();
        return dia != DayOfWeek.SATURDAY && dia != DayOfWeek.SUNDAY;
    }

    private String resolverEstadoTiempo(int diasHabiles, String prioridad, Integer cantidadEventos) {
        String prioridadNormalizada = normalizar(prioridad);
        int eventos = cantidadEventos == null ? 0 : cantidadEventos;

        if (diasHabiles > 3 && (prioridadNormalizada.equals("ALTA") || prioridadNormalizada.equals("CRITICA") || eventos > 1)) {
            return "CRITICO";
        }

        if (diasHabiles > 3) {
            return "VENCIDO";
        }

        if (diasHabiles == 3) {
            return "PROXIMO_A_VENCER";
        }

        if (diasHabiles >= 1) {
            return "EN_PLAZO";
        }

        return "NUEVO";
    }

    private int prioridadEstadoTiempo(String estadoTiempo) {
        return switch (estadoTiempo) {
            case "CRITICO" -> 1;
            case "VENCIDO" -> 2;
            case "PROXIMO_A_VENCER" -> 3;
            case "EN_PLAZO" -> 4;
            case "NUEVO" -> 5;
            default -> throw new IllegalArgumentException("Estado temporal no permitido: " + estadoTiempo);
        };
    }

    private String normalizarEstadoTiempoNullable(String valor) {
        String normalizado = normalizarNullable(valor);
        if (normalizado == null) return null;

        if (!ESTADOS_TIEMPO_PERMITIDOS.contains(normalizado)) {
            throw new IllegalArgumentException("Estado temporal no permitido: " + valor);
        }

        return normalizado;
    }

    private String normalizarPlataformaNullable(String valor) {
        if (valor == null || valor.trim().isEmpty()) return null;

        String normalizado = valor.trim().toLowerCase(Locale.ROOT);
        if (!normalizado.equals("instagram") && !normalizado.equals("tiktok")) {
            throw new IllegalArgumentException("Plataforma no permitida: " + valor);
        }

        return normalizado;
    }

    private void validarFechaNullable(String valor, String nombreCampo) {
        String limpio = vacioANull(valor);
        if (limpio == null) return;

        try {
            LocalDate.parse(limpio);
        } catch (Exception error) {
            throw new IllegalArgumentException("El parámetro " + nombreCampo + " debe venir en formato YYYY-MM-DD.");
        }
    }

    private String normalizarNullable(String valor) {
        if (valor == null || valor.trim().isEmpty()) return null;
        return normalizar(valor);
    }

    private String normalizar(String valor) {
        return String.valueOf(valor).trim().toUpperCase(Locale.ROOT);
    }

    private String vacioANull(String valor) {
        if (valor == null || valor.trim().isEmpty()) return null;
        return valor.trim();
    }
}
