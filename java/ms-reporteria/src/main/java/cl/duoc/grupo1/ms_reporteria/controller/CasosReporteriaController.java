package cl.duoc.grupo1.ms_reporteria.controller;

import cl.duoc.grupo1.ms_reporteria.dto.IndicadorConteoResponse;
import cl.duoc.grupo1.ms_reporteria.service.CasosReporteriaService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reporteria/casos")
public class CasosReporteriaController {

    private final CasosReporteriaService casosReporteriaService;

    public CasosReporteriaController(CasosReporteriaService casosReporteriaService) {
        this.casosReporteriaService = casosReporteriaService;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> obtenerDashboardCasos() {
        return casosReporteriaService.obtenerDashboardCasos();
    }

    @GetMapping("/resumen")
    public Map<String, Object> obtenerResumenCasos() {
        return casosReporteriaService.obtenerResumenCasos();
    }

    @GetMapping("/por-estado")
    public List<IndicadorConteoResponse> contarPorEstado() {
        return casosReporteriaService.contarPorEstado();
    }

    @GetMapping("/por-area")
    public List<IndicadorConteoResponse> contarPorArea() {
        return casosReporteriaService.contarPorArea();
    }

    @GetMapping("/por-prioridad")
    public List<IndicadorConteoResponse> contarPorPrioridad() {
        return casosReporteriaService.contarPorPrioridad();
    }

    @GetMapping("/por-tipo-incidencia")
    public List<IndicadorConteoResponse> contarPorTipoIncidencia() {
        return casosReporteriaService.contarPorTipoIncidencia();
    }

    @GetMapping("/usuarios-top")
    public List<IndicadorConteoResponse> topUsuariosReclamantes() {
        return casosReporteriaService.topUsuariosReclamantes();
    }
}
