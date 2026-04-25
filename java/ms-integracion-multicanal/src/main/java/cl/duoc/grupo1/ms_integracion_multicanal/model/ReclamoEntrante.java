package cl.duoc.grupo1.ms_integracion_multicanal.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reclamos_entrantes")
public class ReclamoEntrante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "canal_id", nullable = false)
    private Canal canal;

    @Column(name = "identificador_externo", length = 255)
    private String identificadorExterno;

    @Column(name = "nombre_cliente", length = 150)
    private String nombreCliente;

    @Column(name = "correo_cliente", length = 150)
    private String correoCliente;

    @Column(length = 255)
    private String asunto;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String mensaje;

    @Column(name = "estado_integracion", nullable = false, length = 50)
    private String estadoIntegracion = "RECIBIDO";

    @Column(name = "fecha_recepcion", nullable = false)
    private LocalDateTime fechaRecepcion;

    @Column(name = "fecha_procesamiento")
    private LocalDateTime fechaProcesamiento;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    @PrePersist
    public void prePersist() {
        LocalDateTime ahora = LocalDateTime.now();
        if (fechaRecepcion == null) fechaRecepcion = ahora;
        if (fechaCreacion == null) fechaCreacion = ahora;
        if (fechaActualizacion == null) fechaActualizacion = ahora;
    }

    @PreUpdate
    public void preUpdate() { fechaActualizacion = LocalDateTime.now(); }

    public Long getId() { return id; }
    public Canal getCanal() { return canal; }
    public String getIdentificadorExterno() { return identificadorExterno; }
    public String getNombreCliente() { return nombreCliente; }
    public String getCorreoCliente() { return correoCliente; }
    public String getAsunto() { return asunto; }
    public String getMensaje() { return mensaje; }
    public String getEstadoIntegracion() { return estadoIntegracion; }
    public LocalDateTime getFechaRecepcion() { return fechaRecepcion; }
    public LocalDateTime getFechaProcesamiento() { return fechaProcesamiento; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }

    public void setId(Long id) { this.id = id; }
    public void setCanal(Canal canal) { this.canal = canal; }
    public void setIdentificadorExterno(String identificadorExterno) { this.identificadorExterno = identificadorExterno; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }
    public void setCorreoCliente(String correoCliente) { this.correoCliente = correoCliente; }
    public void setAsunto(String asunto) { this.asunto = asunto; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }
    public void setEstadoIntegracion(String estadoIntegracion) { this.estadoIntegracion = estadoIntegracion; }
    public void setFechaRecepcion(LocalDateTime fechaRecepcion) { this.fechaRecepcion = fechaRecepcion; }
    public void setFechaProcesamiento(LocalDateTime fechaProcesamiento) { this.fechaProcesamiento = fechaProcesamiento; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
}
