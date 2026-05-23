package cl.duoc.grupo1.ms_reclamos.repository;

import cl.duoc.grupo1.ms_reclamos.dto.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;

@Repository
public class CasosDerivacionRepository {

    private final JdbcTemplate jdbcTemplate;

    public CasosDerivacionRepository(@Qualifier("derivadorJdbcTemplate") JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<CasoDerivacionResumenResponse> listarCasos(
            String estado,
            String area,
            String prioridad,
            String tipo,
            String usuario
    ) {
        String sql = """
            SELECT *
            FROM casos_derivacion
            WHERE (CAST(? AS VARCHAR) IS NULL OR estado_caso = CAST(? AS VARCHAR))
              AND (CAST(? AS VARCHAR) IS NULL OR area_derivacion = CAST(? AS VARCHAR))
              AND (CAST(? AS VARCHAR) IS NULL OR prioridad = CAST(? AS VARCHAR))
              AND (CAST(? AS VARCHAR) IS NULL OR tipo_incidencia = CAST(? AS VARCHAR))
              AND (CAST(? AS VARCHAR) IS NULL OR usuario_comentario ILIKE '%' || CAST(? AS VARCHAR) || '%')
            ORDER BY fecha_ultimo_evento DESC NULLS LAST, id DESC;
            """;

        return jdbcTemplate.query(
                sql,
                this::mapearCaso,
                vacioANull(estado), vacioANull(estado),
                vacioANull(area), vacioANull(area),
                vacioANull(prioridad), vacioANull(prioridad),
                vacioANull(tipo), vacioANull(tipo),
                vacioANull(usuario), vacioANull(usuario)
        );
    }

    public CasoDerivacionResumenResponse obtenerCaso(Long id) {
        return jdbcTemplate.queryForObject(
                """
                SELECT *
                FROM casos_derivacion
                WHERE id = ?;
                """,
                this::mapearCaso,
                id
        );
    }

    public List<ComentarioCasoDerivacionResponse> obtenerComentariosCaso(Long casoId) {
        String sql = """
            SELECT
              c.id AS comentario_negativo_id,
              c.publicacion_id,
              c.plataforma,
              c.tipo_publicacion,
              c.url_publicacion,
              c.usuario_comentario,
              c.texto_comentario,
              c.sentimiento,
              c.puntaje,
              c.likes,
              c.replies,
              c.fecha_scraping,
              p.texto_publicacion,
              p.url_origen,
              p.ruta_imagen_local,
              p.url_imagen_original
            FROM casos_derivacion_comentarios cdc
            JOIN comentarios_negativos c
              ON c.id = cdc.comentario_negativo_id
            LEFT JOIN publicaciones_negativas p
              ON p.id = c.publicacion_id
            WHERE cdc.caso_derivacion_id = ?
            ORDER BY c.fecha_scraping ASC, c.id ASC;
            """;

        return jdbcTemplate.query(sql, this::mapearComentario, casoId);
    }

    public List<CatalogoTipoIncidenciaResponse> listarCatalogoTipos() {
        return jdbcTemplate.query(
                """
                SELECT
                  id,
                  tipo_incidencia,
                  area_derivacion,
                  prioridad,
                  descripcion,
                  activo
                FROM catalogo_tipos_incidencia
                ORDER BY id ASC;
                """,
                (rs, rowNum) -> new CatalogoTipoIncidenciaResponse(
                        rs.getLong("id"),
                        rs.getString("tipo_incidencia"),
                        rs.getString("area_derivacion"),
                        rs.getString("prioridad"),
                        rs.getString("descripcion"),
                        rs.getBoolean("activo")
                )
        );
    }

    public CasoDerivacionResumenResponse cambiarEstado(Long id, String estadoCaso) {
        return jdbcTemplate.queryForObject(
                """
                UPDATE casos_derivacion
                SET estado_caso = ?,
                    updated_at = NOW()
                WHERE id = ?
                RETURNING *;
                """,
                this::mapearCaso,
                estadoCaso,
                id
        );
    }

    public CasoDerivacionResumenResponse asignarCaso(Long id, Long usuarioAsignadoId) {
        return jdbcTemplate.queryForObject(
                """
                UPDATE casos_derivacion
                SET usuario_asignado_id = ?,
                    updated_at = NOW()
                WHERE id = ?
                RETURNING *;
                """,
                this::mapearCaso,
                usuarioAsignadoId,
                id
        );
    }

    public List<UsuarioReclamanteResumenResponse> listarUsuariosReclamantes(String estado) {
        String sql = """
            WITH casos_base AS (
              SELECT
                id,
                usuario_comentario,
                tipo_incidencia,
                area_derivacion,
                prioridad,
                estado_caso,
                cantidad_eventos,
                fecha_ultimo_evento
              FROM casos_derivacion
              WHERE (CAST(? AS VARCHAR) IS NULL OR estado_caso = CAST(? AS VARCHAR))
            ),
            resumen_usuarios AS (
              SELECT
                usuario_comentario,
                COUNT(*)::bigint AS total_casos,
                COALESCE(SUM(cantidad_eventos), 0)::bigint AS total_eventos,
                COUNT(*) FILTER (
                  WHERE estado_caso IN ('ABIERTO', 'DERIVADO', 'EN_GESTION', 'ESCALADO')
                )::bigint AS casos_abiertos,
                COUNT(*) FILTER (
                  WHERE estado_caso IN ('CERRADO', 'DESCARTADO')
                )::bigint AS casos_cerrados,
                CASE
                  WHEN COUNT(*) FILTER (WHERE prioridad = 'CRITICA') > 0 THEN 'CRITICA'
                  WHEN COUNT(*) FILTER (WHERE prioridad = 'ALTA') > 0 THEN 'ALTA'
                  WHEN COUNT(*) FILTER (WHERE prioridad = 'MEDIA') > 0 THEN 'MEDIA'
                  ELSE 'BAJA'
                END AS prioridad_maxima,
                STRING_AGG(DISTINCT area_derivacion, ', ' ORDER BY area_derivacion) AS areas_involucradas,
                STRING_AGG(DISTINCT tipo_incidencia, ', ' ORDER BY tipo_incidencia) AS tipos_incidencia,
                MAX(fecha_ultimo_evento) AS fecha_ultimo_evento
              FROM casos_base
              GROUP BY usuario_comentario
            ),
            origenes_usuarios AS (
              SELECT
                cb.usuario_comentario,
                STRING_AGG(
                  DISTINCT LOWER(TRIM(cn.plataforma)),
                  ', '
                  ORDER BY LOWER(TRIM(cn.plataforma))
                ) AS origenes_detectados
              FROM casos_base cb
              JOIN casos_derivacion_comentarios cdc
                ON cdc.caso_derivacion_id = cb.id
              JOIN comentarios_negativos cn
                ON cn.id = cdc.comentario_negativo_id
              WHERE cn.plataforma IS NOT NULL
                AND TRIM(cn.plataforma) <> ''
              GROUP BY cb.usuario_comentario
            )
            SELECT
              COALESCE(o.origenes_detectados, '') AS origenes_detectados,
              r.usuario_comentario,
              r.total_casos,
              r.total_eventos,
              r.casos_abiertos,
              r.casos_cerrados,
              r.prioridad_maxima,
              r.areas_involucradas,
              r.tipos_incidencia,
              r.fecha_ultimo_evento
            FROM resumen_usuarios r
            LEFT JOIN origenes_usuarios o
              ON o.usuario_comentario = r.usuario_comentario
            ORDER BY r.total_eventos DESC, r.fecha_ultimo_evento DESC NULLS LAST;
            """;

        return jdbcTemplate.query(
                sql,
                this::mapearUsuario,
                vacioANull(estado),
                vacioANull(estado)
        );
    }

    public List<CasoDerivacionResumenResponse> listarCasosPorUsuario(String usuario) {
        return jdbcTemplate.query(
                """
                SELECT *
                FROM casos_derivacion
                WHERE usuario_comentario = ?
                ORDER BY fecha_ultimo_evento DESC NULLS LAST, id DESC;
                """,
                this::mapearCaso,
                usuario
        );
    }

    private CasoDerivacionResumenResponse mapearCaso(ResultSet rs, int rowNum) throws SQLException {
        return new CasoDerivacionResumenResponse(
                rs.getLong("id"),
                rs.getString("usuario_comentario"),
                rs.getString("tipo_incidencia"),
                rs.getString("area_derivacion"),
                rs.getString("prioridad"),
                rs.getString("estado_caso"),
                rs.getInt("cantidad_eventos"),
                obtenerLongNullable(rs, "reclamo_entrante_id_generado"),
                obtenerLongNullable(rs, "reclamo_id_generado"),
                obtenerLongNullable(rs, "clasificacion_id_generada"),
                obtenerLongNullable(rs, "usuario_asignado_id"),
                rs.getString("motivo_decision"),
                obtenerBigDecimalNullable(rs, "confianza"),
                obtenerOffsetDateTime(rs, "fecha_primer_evento"),
                obtenerOffsetDateTime(rs, "fecha_ultimo_evento"),
                obtenerOffsetDateTime(rs, "created_at"),
                obtenerOffsetDateTime(rs, "updated_at")
        );
    }

    private ComentarioCasoDerivacionResponse mapearComentario(ResultSet rs, int rowNum) throws SQLException {
        return new ComentarioCasoDerivacionResponse(
                rs.getLong("comentario_negativo_id"),
                rs.getLong("publicacion_id"),
                rs.getString("plataforma"),
                rs.getString("tipo_publicacion"),
                rs.getString("url_publicacion"),
                rs.getString("usuario_comentario"),
                rs.getString("texto_comentario"),
                rs.getString("sentimiento"),
                rs.getInt("puntaje"),
                rs.getInt("likes"),
                rs.getInt("replies"),
                obtenerOffsetDateTime(rs, "fecha_scraping"),
                rs.getString("texto_publicacion"),
                rs.getString("url_origen"),
                rs.getString("ruta_imagen_local"),
                rs.getString("url_imagen_original")
        );
    }

    private UsuarioReclamanteResumenResponse mapearUsuario(ResultSet rs, int rowNum) throws SQLException {
        return new UsuarioReclamanteResumenResponse(
                rs.getString("origenes_detectados"),
                rs.getString("usuario_comentario"),
                rs.getLong("total_casos"),
                rs.getLong("total_eventos"),
                rs.getLong("casos_abiertos"),
                rs.getLong("casos_cerrados"),
                rs.getString("prioridad_maxima"),
                rs.getString("areas_involucradas"),
                rs.getString("tipos_incidencia"),
                obtenerOffsetDateTime(rs, "fecha_ultimo_evento")
        );
    }

    private Long obtenerLongNullable(ResultSet rs, String columna) throws SQLException {
        long valor = rs.getLong(columna);
        return rs.wasNull() ? null : valor;
    }

    private BigDecimal obtenerBigDecimalNullable(ResultSet rs, String columna) throws SQLException {
        BigDecimal valor = rs.getBigDecimal(columna);
        return rs.wasNull() ? null : valor;
    }

    private OffsetDateTime obtenerOffsetDateTime(ResultSet rs, String columna) throws SQLException {
        try {
            return rs.getObject(columna, OffsetDateTime.class);
        } catch (Exception error) {
            return null;
        }
    }

    private String vacioANull(String valor) {
        if (valor == null || valor.trim().isEmpty()) {
            return null;
        }

        return valor.trim();
    }
}