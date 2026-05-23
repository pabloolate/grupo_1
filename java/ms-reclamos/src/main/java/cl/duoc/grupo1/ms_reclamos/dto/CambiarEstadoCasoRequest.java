package cl.duoc.grupo1.ms_reclamos.dto;

import jakarta.validation.constraints.NotBlank;

public record CambiarEstadoCasoRequest(
        @NotBlank String estadoCaso
) {}
