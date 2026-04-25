package cl.duoc.grupo1.ms_reporteria.controller;

import cl.duoc.grupo1.ms_reporteria.dto.DashboardReporteriaResponse;
import cl.duoc.grupo1.ms_reporteria.dto.IndicadorConteoResponse;
import cl.duoc.grupo1.ms_reporteria.dto.ResumenReporteriaResponse;
import cl.duoc.grupo1.ms_reporteria.service.ReporteriaService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/reporteria")
public class ReporteriaController {

    private final ReporteriaService reporteriaService;

    public ReporteriaController(ReporteriaService reporteriaService) {
        this.reporteriaService = reporteriaService;
    }

    @GetMapping("/resumen")
    public ResumenReporteriaResponse obtenerResumen() {
        return reporteriaService.obtenerResumen();
    }

    @GetMapping("/reclamos-por-estado")
    public List<IndicadorConteoResponse> contarPorEstado() {
        return reporteriaService.contarReclamosPorEstado();
    }

    @GetMapping("/reclamos-por-canal")
    public List<IndicadorConteoResponse> contarPorCanal() {
        return reporteriaService.contarReclamosPorCanal();
    }

    @GetMapping("/reclamos-por-prioridad")
    public List<IndicadorConteoResponse> contarPorPrioridad() {
        return reporteriaService.contarReclamosPorPrioridad();
    }

    @GetMapping("/reclamos-por-categoria")
    public List<IndicadorConteoResponse> contarPorCategoria() {
        return reporteriaService.contarReclamosPorCategoria();
    }

    @GetMapping("/dashboard")
    public DashboardReporteriaResponse obtenerDashboard() {
        return reporteriaService.obtenerDashboard();
    }
}
