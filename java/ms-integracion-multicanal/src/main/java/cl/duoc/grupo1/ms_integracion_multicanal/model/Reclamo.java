package cl.duoc.grupo1.ms_integracion_multicanal.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reclamos")
public class Reclamo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo_reclamo", nullable = false, unique = true, length = 50)
    private String codigoReclamo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "canal_id", nullable = false)
    private Canal canal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reclamo_entrante_id")
    private ReclamoEntrante reclamoEntrante;

    @Column(name = "nombre_cliente", nullable = false, length = 150)
    private String nombreCliente;

    @Column(name = "correo_cliente", length = 150)
    private String correoCliente;

    @Column(nullable = false, length = 255)
    private String asunto;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id")
    private CategoriaReclamo categoria;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prioridad_id", nullable = false)
    private PrioridadReclamo prioridad;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estado_id", nullable = false)
    private EstadoReclamo estado;

    @Column(name = "usuario_asignado_id")
    private Long usuarioAsignadoId;

    @Column(name = "requiere_atencion_humana", nullable = false)
    private Boolean requiereAtencionHumana = true;

    @Column(name = "fecha_primera_respuesta")
    private LocalDateTime fechaPrimeraRespuesta;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

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
    public String getCodigoReclamo() { return codigoReclamo; }
    public Canal getCanal() { return canal; }
    public ReclamoEntrante getReclamoEntrante() { return reclamoEntrante; }
    public String getNombreCliente() { return nombreCliente; }
    public String getCorreoCliente() { return correoCliente; }
    public String getAsunto() { return asunto; }
    public String getDescripcion() { return descripcion; }
    public CategoriaReclamo getCategoria() { return categoria; }
    public PrioridadReclamo getPrioridad() { return prioridad; }
    public EstadoReclamo getEstado() { return estado; }
    public Long getUsuarioAsignadoId() { return usuarioAsignadoId; }
    public Boolean getRequiereAtencionHumana() { return requiereAtencionHumana; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }

    public void setId(Long id) { this.id = id; }
    public void setCodigoReclamo(String codigoReclamo) { this.codigoReclamo = codigoReclamo; }
    public void setCanal(Canal canal) { this.canal = canal; }
    public void setReclamoEntrante(ReclamoEntrante reclamoEntrante) { this.reclamoEntrante = reclamoEntrante; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }
    public void setCorreoCliente(String correoCliente) { this.correoCliente = correoCliente; }
    public void setAsunto(String asunto) { this.asunto = asunto; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public void setCategoria(CategoriaReclamo categoria) { this.categoria = categoria; }
    public void setPrioridad(PrioridadReclamo prioridad) { this.prioridad = prioridad; }
    public void setEstado(EstadoReclamo estado) { this.estado = estado; }
    public void setUsuarioAsignadoId(Long usuarioAsignadoId) { this.usuarioAsignadoId = usuarioAsignadoId; }
    public void setRequiereAtencionHumana(Boolean requiereAtencionHumana) { this.requiereAtencionHumana = requiereAtencionHumana; }
    public void setFechaPrimeraRespuesta(LocalDateTime fechaPrimeraRespuesta) { this.fechaPrimeraRespuesta = fechaPrimeraRespuesta; }
    public void setFechaCierre(LocalDateTime fechaCierre) { this.fechaCierre = fechaCierre; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
}
