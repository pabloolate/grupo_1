package cl.duoc.grupo1.ms_reclamos.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "reclamos_clasificacion_ia")
public class ReclamoClasificacionIa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reclamo_id", nullable = false)
    private Reclamo reclamo;

    @Column(name = "categoria_sugerida")
    private String categoriaSugerida;

    @Column(name = "prioridad_sugerida")
    private String prioridadSugerida;

    private String polaridad;

    @Column(columnDefinition = "TEXT")
    private String resumen;

    @Column(name = "respuesta_sugerida", columnDefinition = "TEXT")
    private String respuestaSugerida;

    private BigDecimal confianza;

    @Column(name = "modelo_usado")
    private String modeloUsado;

    @Column(name = "requiere_revision_humana", nullable = false)
    private Boolean requiereRevisionHumana;

    @Column(name = "fecha_clasificacion", nullable = false)
    private LocalDateTime fechaClasificacion;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;
}
