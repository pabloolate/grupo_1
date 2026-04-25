package cl.duoc.grupo1.ms_reclamos.dto;

import jakarta.validation.constraints.NotBlank;

public record CrearComentarioRequest(Long usuarioId, @NotBlank(message = "El comentario es obligatorio") String comentario, Boolean esInterno) {}
