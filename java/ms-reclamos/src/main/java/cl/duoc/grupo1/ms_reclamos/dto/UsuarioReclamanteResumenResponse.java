package cl.duoc.grupo1.ms_reclamos.dto;

import java.time.OffsetDateTime;

public record UsuarioReclamanteResumenResponse(
        String origenesDetectados,
        String usuarioComentario,
        Long totalCasos,
        Long totalEventos,
        Long casosAbiertos,
        Long casosCerrados,
        String prioridadMaxima,
        String areasInvolucradas,
        String tiposIncidencia,
        OffsetDateTime fechaUltimoEvento
) {
}