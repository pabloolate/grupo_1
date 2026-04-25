package cl.duoc.grupo1.ms_reclamos.dto;

import java.time.LocalDateTime;

public record ErrorResponse(String mensaje, LocalDateTime fecha) {}
