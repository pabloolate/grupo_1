package cl.duoc.grupo1.ms_reclamos.dto;

import jakarta.validation.constraints.NotBlank;

public record CambiarEstadoRequest(@NotBlank(message = "El estado es obligatorio") String estado, Long usuarioId, String observacion) {}
