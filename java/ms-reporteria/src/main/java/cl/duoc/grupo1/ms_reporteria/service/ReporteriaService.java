package cl.duoc.grupo1.ms_reporteria.service;

import cl.duoc.grupo1.ms_reporteria.dto.DashboardReporteriaResponse;
import cl.duoc.grupo1.ms_reporteria.dto.IndicadorConteoResponse;
import cl.duoc.grupo1.ms_reporteria.dto.ResumenReporteriaResponse;
import cl.duoc.grupo1.ms_reporteria.repository.ReporteriaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReporteriaService {

    private final ReporteriaRepository reporteriaRepository;

    public ReporteriaService(ReporteriaRepository reporteriaRepository) {
        this.reporteriaRepository = reporteriaRepository;
    }

    public ResumenReporteriaResponse obtenerResumen() {
        return reporteriaRepository.obtenerResumen();
    }

    public List<IndicadorConteoResponse> contarReclamosPorEstado() {
        return reporteriaRepository.contarPorEstado();
    }

    public List<IndicadorConteoResponse> contarReclamosPorCanal() {
        return reporteriaRepository.contarPorCanal();
    }

    public List<IndicadorConteoResponse> contarReclamosPorPrioridad() {
        return reporteriaRepository.contarPorPrioridad();
    }

    public List<IndicadorConteoResponse> contarReclamosPorCategoria() {
        return reporteriaRepository.contarPorCategoria();
    }

    public DashboardReporteriaResponse obtenerDashboard() {
        DashboardReporteriaResponse dashboard = new DashboardReporteriaResponse();
        dashboard.setResumen(obtenerResumen());
        dashboard.setReclamosPorEstado(contarReclamosPorEstado());
        dashboard.setReclamosPorCanal(contarReclamosPorCanal());
        dashboard.setReclamosPorPrioridad(contarReclamosPorPrioridad());
        dashboard.setReclamosPorCategoria(contarReclamosPorCategoria());
        return dashboard;
    }
}
