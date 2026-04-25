package cl.duoc.grupo1.ms_integracion_multicanal.dto;

public class ReclamoCreadoResponse {
    private Long reclamoEntranteId;
    private Long reclamoId;
    private String codigoReclamo;
    private String canal;
    private String estadoIntegracion;
    private String estadoReclamo;
    private String mensaje;

    public ReclamoCreadoResponse(Long reclamoEntranteId, Long reclamoId, String codigoReclamo, String canal, String estadoIntegracion, String estadoReclamo, String mensaje) {
        this.reclamoEntranteId = reclamoEntranteId;
        this.reclamoId = reclamoId;
        this.codigoReclamo = codigoReclamo;
        this.canal = canal;
        this.estadoIntegracion = estadoIntegracion;
        this.estadoReclamo = estadoReclamo;
        this.mensaje = mensaje;
    }

    public Long getReclamoEntranteId() { return reclamoEntranteId; }
    public Long getReclamoId() { return reclamoId; }
    public String getCodigoReclamo() { return codigoReclamo; }
    public String getCanal() { return canal; }
    public String getEstadoIntegracion() { return estadoIntegracion; }
    public String getEstadoReclamo() { return estadoReclamo; }
    public String getMensaje() { return mensaje; }
}
