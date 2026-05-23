package cl.duoc.grupo1.ms_reclamos.dto;

import jakarta.validation.constraints.NotNull;

public record AsignarCasoRequest(
        @NotNull Long usuarioAsignadoId
) {}
