package cl.duoc.grupo1.ms_reclamos.dto;

import java.util.List;

public record CasoDerivacionDetalleResponse(
        CasoDerivacionResumenResponse caso,
        List<ComentarioCasoDerivacionResponse> comentarios
) {}
