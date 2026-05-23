package cl.duoc.grupo1.ms_reclamos.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CasoDerivacionResumenResponse(
        Long id,
        String usuarioComentario,
        String tipoIncidencia,
        String areaDerivacion,
        String prioridad,
        String estadoCaso,
        Integer cantidadEventos,
        Long reclamoEntranteIdGenerado,
        Long reclamoIdGenerado,
        Long clasificacionIdGenerada,
        Long usuarioAsignadoId,
        String motivoDecision,
        BigDecimal confianza,
        OffsetDateTime fechaPrimerEvento,
        OffsetDateTime fechaUltimoEvento,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
