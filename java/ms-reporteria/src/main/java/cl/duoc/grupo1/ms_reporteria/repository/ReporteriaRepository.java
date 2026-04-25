package cl.duoc.grupo1.ms_reporteria.repository;

import cl.duoc.grupo1.ms_reporteria.dto.IndicadorConteoResponse;
import cl.duoc.grupo1.ms_reporteria.dto.ResumenReporteriaResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public class ReporteriaRepository {

    private final JdbcTemplate jdbcTemplate;

    public ReporteriaRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public ResumenReporteriaResponse obtenerResumen() {
        String sql = """
            SELECT
              COUNT(r.id) AS total_reclamos,
              COUNT(r.id) FILTER (WHERE COALESCE(e.es_estado_final, false) = false) AS reclamos_abiertos,
              COUNT(r.id) FILTER (WHERE COALESCE(e.es_estado_final, false) = true) AS reclamos_cerrados,
              COUNT(r.id) FILTER (WHERE e.nombre = 'DERIVADO') AS reclamos_derivados,
              (SELECT COUNT(DISTINCT reclamo_id) FROM reclamos_clasificacion_ia) AS reclamos_con_ia,
              ROUND(AVG(EXTRACT(EPOCH FROM (r.fecha_primera_respuesta - r.fecha_creacion)) / 60)::numeric, 2) AS promedio_primera_respuesta,
              ROUND(AVG(EXTRACT(EPOCH FROM (r.fecha_cierre - r.fecha_creacion)) / 60)::numeric, 2) AS promedio_cierre
            FROM reclamos r
            JOIN estados_reclamo e ON e.id = r.estado_id
            """;

        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
            ResumenReporteriaResponse resumen = new ResumenReporteriaResponse();
            resumen.setTotalReclamos(rs.getLong("total_reclamos"));
            resumen.setReclamosAbiertos(rs.getLong("reclamos_abiertos"));
            resumen.setReclamosCerrados(rs.getLong("reclamos_cerrados"));
            resumen.setReclamosDerivados(rs.getLong("reclamos_derivados"));
            resumen.setReclamosConIa(rs.getLong("reclamos_con_ia"));
            resumen.setPromedioMinutosPrimeraRespuesta(obtenerBigDecimalSeguro(rs.getBigDecimal("promedio_primera_respuesta")));
            resumen.setPromedioMinutosCierre(obtenerBigDecimalSeguro(rs.getBigDecimal("promedio_cierre")));
            return resumen;
        });
    }

    public List<IndicadorConteoResponse> contarPorEstado() {
        return contarPorCatalogo("""
            SELECT e.nombre AS nombre, COUNT(r.id) AS total
            FROM estados_reclamo e
            LEFT JOIN reclamos r ON r.estado_id = e.id
            GROUP BY e.id, e.nombre, e.orden
            ORDER BY e.orden
            """);
    }

    public List<IndicadorConteoResponse> contarPorCanal() {
        return contarPorCatalogo("""
            SELECT c.nombre AS nombre, COUNT(r.id) AS total
            FROM canales c
            LEFT JOIN reclamos r ON r.canal_id = c.id
            GROUP BY c.id, c.nombre
            ORDER BY total DESC, c.nombre ASC
            """);
    }

    public List<IndicadorConteoResponse> contarPorPrioridad() {
        return contarPorCatalogo("""
            SELECT p.nombre AS nombre, COUNT(r.id) AS total
            FROM prioridades_reclamo p
            LEFT JOIN reclamos r ON r.prioridad_id = p.id
            GROUP BY p.id, p.nombre, p.nivel
            ORDER BY p.nivel
            """);
    }

    public List<IndicadorConteoResponse> contarPorCategoria() {
        return contarPorCatalogo("""
            SELECT c.nombre AS nombre, COUNT(r.id) AS total
            FROM categorias_reclamo c
            LEFT JOIN reclamos r ON r.categoria_id = c.id
            GROUP BY c.id, c.nombre
            ORDER BY total DESC, c.nombre ASC
            """);
    }

    private List<IndicadorConteoResponse> contarPorCatalogo(String sql) {
        return jdbcTemplate.query(sql, (rs, rowNum) -> new IndicadorConteoResponse(
            rs.getString("nombre"),
            rs.getLong("total")
        ));
    }

    private BigDecimal obtenerBigDecimalSeguro(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }
}
