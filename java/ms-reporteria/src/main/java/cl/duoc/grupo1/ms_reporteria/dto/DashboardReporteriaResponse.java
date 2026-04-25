package cl.duoc.grupo1.ms_reporteria.dto;

import java.util.List;

public class DashboardReporteriaResponse {
    private ResumenReporteriaResponse resumen;
    private List<IndicadorConteoResponse> reclamosPorEstado;
    private List<IndicadorConteoResponse> reclamosPorCanal;
    private List<IndicadorConteoResponse> reclamosPorPrioridad;
    private List<IndicadorConteoResponse> reclamosPorCategoria;

    public ResumenReporteriaResponse getResumen() {
        return resumen;
    }

    public void setResumen(ResumenReporteriaResponse resumen) {
        this.resumen = resumen;
    }

    public List<IndicadorConteoResponse> getReclamosPorEstado() {
        return reclamosPorEstado;
    }

    public void setReclamosPorEstado(List<IndicadorConteoResponse> reclamosPorEstado) {
        this.reclamosPorEstado = reclamosPorEstado;
    }

    public List<IndicadorConteoResponse> getReclamosPorCanal() {
        return reclamosPorCanal;
    }

    public void setReclamosPorCanal(List<IndicadorConteoResponse> reclamosPorCanal) {
        this.reclamosPorCanal = reclamosPorCanal;
    }

    public List<IndicadorConteoResponse> getReclamosPorPrioridad() {
        return reclamosPorPrioridad;
    }

    public void setReclamosPorPrioridad(List<IndicadorConteoResponse> reclamosPorPrioridad) {
        this.reclamosPorPrioridad = reclamosPorPrioridad;
    }

    public List<IndicadorConteoResponse> getReclamosPorCategoria() {
        return reclamosPorCategoria;
    }

    public void setReclamosPorCategoria(List<IndicadorConteoResponse> reclamosPorCategoria) {
        this.reclamosPorCategoria = reclamosPorCategoria;
    }
}
