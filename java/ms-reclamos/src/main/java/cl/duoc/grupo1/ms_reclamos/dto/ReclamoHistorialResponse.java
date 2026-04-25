package cl.duoc.grupo1.ms_reclamos.dto;

import java.time.LocalDateTime;

public record ReclamoHistorialResponse(Long id, String usuarioNombre, String estadoAnterior, String estadoNuevo, String prioridadAnterior, String prioridadNueva, String accion, String observacion, LocalDateTime fechaCreacion) {}
