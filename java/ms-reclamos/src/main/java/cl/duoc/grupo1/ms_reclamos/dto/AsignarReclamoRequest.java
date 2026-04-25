package cl.duoc.grupo1.ms_reclamos.dto;

import jakarta.validation.constraints.NotNull;

public record AsignarReclamoRequest(@NotNull(message = "El usuarioId es obligatorio") Long usuarioId, String observacion) {}
