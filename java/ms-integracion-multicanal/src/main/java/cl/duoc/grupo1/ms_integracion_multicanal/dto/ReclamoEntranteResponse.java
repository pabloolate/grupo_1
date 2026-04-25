package cl.duoc.grupo1.ms_integracion_multicanal.dto;

import java.time.LocalDateTime;

public class ReclamoEntranteResponse {
    private Long id;
    private String canal;
    private String identificadorExterno;
    private String nombreCliente;
    private String correoCliente;
    private String asunto;
    private String mensaje;
    private String estadoIntegracion;
    private LocalDateTime fechaRecepcion;

    public ReclamoEntranteResponse(Long id, String canal, String identificadorExterno, String nombreCliente, String correoCliente, String asunto, String mensaje, String estadoIntegracion, LocalDateTime fechaRecepcion) {
        this.id = id;
        this.canal = canal;
        this.identificadorExterno = identificadorExterno;
        this.nombreCliente = nombreCliente;
        this.correoCliente = correoCliente;
        this.asunto = asunto;
        this.mensaje = mensaje;
        this.estadoIntegracion = estadoIntegracion;
        this.fechaRecepcion = fechaRecepcion;
    }

    public Long getId() { return id; }
    public String getCanal() { return canal; }
    public String getIdentificadorExterno() { return identificadorExterno; }
    public String getNombreCliente() { return nombreCliente; }
    public String getCorreoCliente() { return correoCliente; }
    public String getAsunto() { return asunto; }
    public String getMensaje() { return mensaje; }
    public String getEstadoIntegracion() { return estadoIntegracion; }
    public LocalDateTime getFechaRecepcion() { return fechaRecepcion; }
}
