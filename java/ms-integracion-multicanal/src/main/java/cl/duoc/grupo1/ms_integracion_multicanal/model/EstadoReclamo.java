package cl.duoc.grupo1.ms_integracion_multicanal.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "estados_reclamo")
public class EstadoReclamo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(nullable = false)
    private Integer orden;

    @Column(name = "es_estado_final", nullable = false)
    private Boolean esEstadoFinal = false;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    @PrePersist
    public void prePersist() {
        LocalDateTime ahora = LocalDateTime.now();
        if (fechaCreacion == null) fechaCreacion = ahora;
        if (fechaActualizacion == null) fechaActualizacion = ahora;
    }

    @PreUpdate
    public void preUpdate() { fechaActualizacion = LocalDateTime.now(); }

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getDescripcion() { return descripcion; }
    public Integer getOrden() { return orden; }
    public Boolean getEsEstadoFinal() { return esEstadoFinal; }
    public Boolean getActivo() { return activo; }

    public void setId(Long id) { this.id = id; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public void setOrden(Integer orden) { this.orden = orden; }
    public void setEsEstadoFinal(Boolean esEstadoFinal) { this.esEstadoFinal = esEstadoFinal; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}
