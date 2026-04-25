package cl.duoc.grupo1.ms_integracion_multicanal.dto;

public class CanalResponse {
    private Long id;
    private String nombre;
    private String descripcion;
    private Boolean activo;

    public CanalResponse(Long id, String nombre, String descripcion, Boolean activo) {
        this.id = id;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.activo = activo;
    }

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getDescripcion() { return descripcion; }
    public Boolean getActivo() { return activo; }
}
