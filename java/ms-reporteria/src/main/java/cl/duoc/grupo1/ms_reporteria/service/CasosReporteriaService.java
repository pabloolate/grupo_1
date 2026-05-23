package cl.duoc.grupo1.ms_reporteria.service;

import cl.duoc.grupo1.ms_reporteria.dto.IndicadorConteoResponse;
import cl.duoc.grupo1.ms_reporteria.repository.CasosReporteriaRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class CasosReporteriaService {

    private final CasosReporteriaRepository casosReporteriaRepository;

    public CasosReporteriaService(CasosReporteriaRepository casosReporteriaRepository) {
        this.casosReporteriaRepository = casosReporteriaRepository;
    }

    public Map<String, Object> obtenerDashboardCasos() {
        Map<String, Object> dashboard = new LinkedHashMap<>();
        dashboard.put("resumen", casosReporteriaRepository.obtenerResumenCasos());
        dashboard.put("casosPorEstado", casosReporteriaRepository.contarPorEstado());
        dashboard.put("casosPorArea", casosReporteriaRepository.contarPorArea());
        dashboard.put("casosPorPrioridad", casosReporteriaRepository.contarPorPrioridad());
        dashboard.put("casosPorTipoIncidencia", casosReporteriaRepository.contarPorTipoIncidencia());
        dashboard.put("usuariosReclamantesTop", casosReporteriaRepository.topUsuariosReclamantes());
        return dashboard;
    }

    public Map<String, Object> obtenerResumenCasos() {
        return casosReporteriaRepository.obtenerResumenCasos();
    }

    public List<IndicadorConteoResponse> contarPorEstado() {
        return casosReporteriaRepository.contarPorEstado();
    }

    public List<IndicadorConteoResponse> contarPorArea() {
        return casosReporteriaRepository.contarPorArea();
    }

    public List<IndicadorConteoResponse> contarPorPrioridad() {
        return casosReporteriaRepository.contarPorPrioridad();
    }

    public List<IndicadorConteoResponse> contarPorTipoIncidencia() {
        return casosReporteriaRepository.contarPorTipoIncidencia();
    }

    public List<IndicadorConteoResponse> topUsuariosReclamantes() {
        return casosReporteriaRepository.topUsuariosReclamantes();
    }
}
