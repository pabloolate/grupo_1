package cl.duoc.grupo1.ms_reporteria.model;

public class ReporteLectura {
    private String nombre;
    private Long total;

    public ReporteLectura() {
    }

    public ReporteLectura(String nombre, Long total) {
        this.nombre = nombre;
        this.total = total;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Long getTotal() {
        return total;
    }

    public void setTotal(Long total) {
        this.total = total;
    }
}
