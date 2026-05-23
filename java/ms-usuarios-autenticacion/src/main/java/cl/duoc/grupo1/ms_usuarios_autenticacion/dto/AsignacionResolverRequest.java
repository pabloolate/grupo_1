package cl.duoc.grupo1.ms_usuarios_autenticacion.dto;

import jakarta.validation.constraints.NotBlank;

public record AsignacionResolverRequest(
        @NotBlank String areaDerivacion,
        String tipoIncidencia,
        String prioridad
) {}
