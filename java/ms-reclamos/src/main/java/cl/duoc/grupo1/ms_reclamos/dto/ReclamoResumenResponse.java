package cl.duoc.grupo1.ms_reclamos.dto;

import java.time.LocalDateTime;

public record ReclamoResumenResponse(Long id, String codigoReclamo, String nombreCliente, String correoCliente, String asunto, String canal, String categoria, String prioridad, String estado, Long usuarioAsignadoId, String usuarioAsignadoNombre, Boolean requiereAtencionHumana, LocalDateTime fechaCreacion, LocalDateTime fechaActualizacion, LocalDateTime fechaCierre) {}
