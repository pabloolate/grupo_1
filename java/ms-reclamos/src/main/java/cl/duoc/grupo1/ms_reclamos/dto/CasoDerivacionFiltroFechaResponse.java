package cl.duoc.grupo1.ms_reclamos.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CasoDerivacionFiltroFechaResponse(
        Long id,
        String usuarioComentario,
        String tipoIncidencia,
        String areaDerivacion,
        String prioridad,
        String estadoCaso,
        Integer cantidadEventos,
        Long reclamoEntranteIdGenerado,
        Long reclamoIdGenerado,
        String codigoReclamo,
        Long clasificacionIdGenerada,
        Long usuarioAsignadoId,
        String motivoDecision,
        BigDecimal confianza,
        OffsetDateTime fechaPrimerEvento,
        OffsetDateTime fechaUltimoEvento,
        Integer diasHabilesTranscurridos,
        String estadoTiempo,
        String plataforma,
        String urlPublicacion,
        String textoResumen
) {}