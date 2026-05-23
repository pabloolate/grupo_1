package cl.duoc.grupo1.ms_reclamos.dto;

public record CatalogoTipoIncidenciaResponse(
        Long id,
        String tipoIncidencia,
        String areaDerivacion,
        String prioridad,
        String descripcion,
        Boolean activo
) {}
