package cl.duoc.grupo1.ms_reporteria.repository;

import cl.duoc.grupo1.ms_reporteria.dto.IndicadorConteoResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class CasosReporteriaRepository {

    private final JdbcTemplate jdbcTemplate;

    public CasosReporteriaRepository(@Qualifier("derivadorJdbcTemplate") JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> obtenerResumenCasos() {
        return jdbcTemplate.queryForMap("""
            SELECT
              COUNT(*)::bigint AS total_casos,
              COUNT(*) FILTER (WHERE estado_caso IN ('ABIERTO', 'DERIVADO', 'EN_GESTION', 'ESCALADO'))::bigint AS casos_abiertos,
              COUNT(*) FILTER (WHERE estado_caso IN ('CERRADO', 'DESCARTADO'))::bigint AS casos_cerrados,
              COUNT(*) FILTER (WHERE prioridad = 'CRITICA')::bigint AS casos_criticos,
              COUNT(DISTINCT usuario_comentario)::bigint AS usuarios_reclamantes,
              COALESCE(SUM(cantidad_eventos), 0)::bigint AS total_evidencias,
              ROUND(AVG(cantidad_eventos)::numeric, 2) AS promedio_eventos_por_caso
            FROM casos_derivacion;
            """);
    }

    public List<IndicadorConteoResponse> contarPorEstado() {
        return contar("""
            SELECT estado_caso AS nombre, COUNT(*)::bigint AS total
            FROM casos_derivacion
            GROUP BY estado_caso
            ORDER BY total DESC, estado_caso ASC;
            """);
    }

    public List<IndicadorConteoResponse> contarPorArea() {
        return contar("""
            SELECT area_derivacion AS nombre, COUNT(*)::bigint AS total
            FROM casos_derivacion
            GROUP BY area_derivacion
            ORDER BY total DESC, area_derivacion ASC;
            """);
    }

    public List<IndicadorConteoResponse> contarPorPrioridad() {
        return contar("""
            SELECT prioridad AS nombre, COUNT(*)::bigint AS total
            FROM casos_derivacion
            GROUP BY prioridad
            ORDER BY CASE prioridad
              WHEN 'CRITICA' THEN 1
              WHEN 'ALTA' THEN 2
              WHEN 'MEDIA' THEN 3
              ELSE 4
            END;
            """);
    }

    public List<IndicadorConteoResponse> contarPorTipoIncidencia() {
        return contar("""
            SELECT tipo_incidencia AS nombre, COUNT(*)::bigint AS total
            FROM casos_derivacion
            GROUP BY tipo_incidencia
            ORDER BY total DESC, tipo_incidencia ASC;
            """);
    }

    public List<IndicadorConteoResponse> topUsuariosReclamantes() {
        return contar("""
            SELECT usuario_comentario AS nombre, COALESCE(SUM(cantidad_eventos), 0)::bigint AS total
            FROM casos_derivacion
            GROUP BY usuario_comentario
            ORDER BY total DESC, usuario_comentario ASC
            LIMIT 10;
            """);
    }

    private List<IndicadorConteoResponse> contar(String sql) {
        return jdbcTemplate.query(sql, (rs, rowNum) -> new IndicadorConteoResponse(
                rs.getString("nombre"),
                rs.getLong("total")
        ));
    }
}
