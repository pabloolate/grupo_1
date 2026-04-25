package cl.duoc.grupo1.ms_reclamos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ReclamoClasificacionIaResponse(Long id, String categoriaSugerida, String prioridadSugerida, String polaridad, String resumen, String respuestaSugerida, BigDecimal confianza, String modeloUsado, Boolean requiereRevisionHumana, LocalDateTime fechaClasificacion) {}
