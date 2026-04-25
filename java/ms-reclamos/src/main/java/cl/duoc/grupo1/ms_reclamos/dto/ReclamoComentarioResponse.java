package cl.duoc.grupo1.ms_reclamos.dto;

import java.time.LocalDateTime;

public record ReclamoComentarioResponse(Long id, Long usuarioId, String usuarioNombre, String comentario, Boolean esInterno, LocalDateTime fechaCreacion) {}
