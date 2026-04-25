package cl.duoc.grupo1.ms_reclamos.dto;

import java.time.LocalDateTime;

public record ReclamoDetalleResponse(Long id, String codigoReclamo, Long reclamoEntranteId, String nombreCliente, String correoCliente, String asunto, String descripcion, String canal, String categoria, String prioridad, String estado, Long usuarioAsignadoId, String usuarioAsignadoNombre, Boolean requiereAtencionHumana, LocalDateTime fechaPrimeraRespuesta, LocalDateTime fechaCreacion, LocalDateTime fechaActualizacion, LocalDateTime fechaCierre, ReclamoClasificacionIaResponse ultimaClasificacionIa) {}
