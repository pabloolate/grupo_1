package cl.duoc.grupo1.ms_reclamos.repository;

import cl.duoc.grupo1.ms_reclamos.dto.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Repository
public class CasosDerivacionRepository {

    private final JdbcTemplate derivadorJdbcTemplate;
    private final JdbcTemplate generalJdbcTemplate;

    public CasosDerivacionRepository(
            @Qualifier("derivadorJdbcTemplate") JdbcTemplate derivadorJdbcTemplate,
            DataSource dataSource
    ) {
        this.derivadorJdbcTemplate = derivadorJdbcTemplate;
        this.generalJdbcTemplate = new JdbcTemplate(dataSource);
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
            ORDER BY fecha_ultimo_evento DESC, id DESC;
            """;

        List<CasoDerivacionResumenResponse> casos = derivadorJdbcTemplate.query(
                sql,
                this::mapearCaso,
                vacioANull(estado), vacioANull(estado),
                vacioANull(area), vacioANull(area),
                vacioANull(prioridad), vacioANull(prioridad),
                vacioANull(tipo), vacioANull(tipo),
                vacioANull(usuario), vacioANull(usuario)
        );

        return completarCodigosReclamoResumen(casos);
    }

    public List<CasoDerivacionFiltroFechaResponse> listarCasosParaFiltroFechas(
            String desde,
            String hasta,
            String plataforma,
            String area,
            String prioridad,
            String tipo,
            String usuario
    ) {
        String sql = """
            SELECT
              cd.*,
              cn.plataforma AS plataforma_origen,
              cn.url_publicacion AS url_publicacion_origen,
              LEFT(cn.texto_comentario, 180) AS texto_resumen
            FROM casos_derivacion cd
            JOIN comentarios_negativos cn
              ON cn.id = cd.primer_comentario_id
            WHERE cd.fecha_primer_evento IS NOT NULL
              AND (CAST(? AS DATE) IS NULL OR cd.fecha_primer_evento::date >= CAST(? AS DATE))
              AND (CAST(? AS DATE) IS NULL OR cd.fecha_primer_evento::date <= CAST(? AS DATE))
              AND (CAST(? AS VARCHAR) IS NULL OR LOWER(TRIM(cn.plataforma)) = LOWER(TRIM(CAST(? AS VARCHAR))))
              AND (CAST(? AS VARCHAR) IS NULL OR cd.area_derivacion = CAST(? AS VARCHAR))
              AND (CAST(? AS VARCHAR) IS NULL OR cd.prioridad = CAST(? AS VARCHAR))
              AND (CAST(? AS VARCHAR) IS NULL OR cd.tipo_incidencia = CAST(? AS VARCHAR))
              AND (CAST(? AS VARCHAR) IS NULL OR cd.usuario_comentario ILIKE '%' || CAST(? AS VARCHAR) || '%')
            ORDER BY cd.fecha_primer_evento ASC, cd.id ASC;
            """;

        List<CasoDerivacionFiltroFechaResponse> casos = derivadorJdbcTemplate.query(
                sql,
                this::mapearCasoFiltroFechaBase,
                vacioANull(desde), vacioANull(desde),
                vacioANull(hasta), vacioANull(hasta),
                vacioANull(plataforma), vacioANull(plataforma),
                vacioANull(area), vacioANull(area),
                vacioANull(prioridad), vacioANull(prioridad),
                vacioANull(tipo), vacioANull(tipo),
                vacioANull(usuario), vacioANull(usuario)
        );

        return completarCodigosReclamoFiltro(casos);
    }

    public CasoDerivacionResumenResponse obtenerCaso(Long id) {
        CasoDerivacionResumenResponse caso = derivadorJdbcTemplate.queryForObject(
                """
                SELECT *
                FROM casos_derivacion
                WHERE id = ?;
                """,
                this::mapearCaso,
                id
        );

        return completarCodigoReclamoResumen(caso);
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
              c.fecha_comentario
            FROM casos_derivacion_comentarios cdc
            JOIN comentarios_negativos c
              ON c.id = cdc.comentario_negativo_id
            WHERE cdc.caso_derivacion_id = ?
            ORDER BY c.fecha_comentario ASC, c.id ASC;
            """;

        return derivadorJdbcTemplate.query(sql, this::mapearComentario, casoId);
    }

    public List<CatalogoTipoIncidenciaResponse> listarCatalogoTipos() {
        return derivadorJdbcTemplate.query(
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
        CasoDerivacionResumenResponse caso = derivadorJdbcTemplate.queryForObject(
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

        return completarCodigoReclamoResumen(caso);
    }

    public CasoDerivacionResumenResponse asignarCaso(Long id, Long usuarioAsignadoId) {
        CasoDerivacionResumenResponse caso = derivadorJdbcTemplate.queryForObject(
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

        return completarCodigoReclamoResumen(caso);
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
            ORDER BY r.total_eventos DESC, r.fecha_ultimo_evento DESC;
            """;

        return derivadorJdbcTemplate.query(
                sql,
                this::mapearUsuario,
                vacioANull(estado),
                vacioANull(estado)
        );
    }

    public List<CasoDerivacionResumenResponse> listarCasosPorUsuario(String usuario) {
        List<CasoDerivacionResumenResponse> casos = derivadorJdbcTemplate.query(
                """
                SELECT *
                FROM casos_derivacion
                WHERE usuario_comentario = ?
                ORDER BY fecha_ultimo_evento DESC, id DESC;
                """,
                this::mapearCaso,
                usuario
        );

        return completarCodigosReclamoResumen(casos);
    }

    private List<CasoDerivacionResumenResponse> completarCodigosReclamoResumen(List<CasoDerivacionResumenResponse> casos) {
        Map<Long, String> codigos = obtenerCodigosReclamoPorIds(obtenerIdsReclamoResumen(casos));
        List<CasoDerivacionResumenResponse> resultado = new ArrayList<>();

        for (CasoDerivacionResumenResponse caso : casos) {
            resultado.add(conCodigoReclamo(caso, obtenerCodigoReclamoObligatorio(codigos, caso.reclamoIdGenerado(), caso.id())));
        }

        return resultado;
    }

    private CasoDerivacionResumenResponse completarCodigoReclamoResumen(CasoDerivacionResumenResponse caso) {
        return completarCodigosReclamoResumen(List.of(caso)).get(0);
    }

    private List<CasoDerivacionFiltroFechaResponse> completarCodigosReclamoFiltro(List<CasoDerivacionFiltroFechaResponse> casos) {
        Map<Long, String> codigos = obtenerCodigosReclamoPorIds(obtenerIdsReclamoFiltro(casos));
        List<CasoDerivacionFiltroFechaResponse> resultado = new ArrayList<>();

        for (CasoDerivacionFiltroFechaResponse caso : casos) {
            resultado.add(conCodigoReclamo(caso, obtenerCodigoReclamoObligatorio(codigos, caso.reclamoIdGenerado(), caso.id())));
        }

        return resultado;
    }

    private Set<Long> obtenerIdsReclamoResumen(List<CasoDerivacionResumenResponse> casos) {
        Set<Long> ids = new LinkedHashSet<>();
        for (CasoDerivacionResumenResponse caso : casos) {
            if (caso.reclamoIdGenerado() == null) {
                throw new IllegalStateException("Caso " + caso.id() + " no trae reclamo_id_generado.");
            }
            ids.add(caso.reclamoIdGenerado());
        }
        return ids;
    }

    private Set<Long> obtenerIdsReclamoFiltro(List<CasoDerivacionFiltroFechaResponse> casos) {
        Set<Long> ids = new LinkedHashSet<>();
        for (CasoDerivacionFiltroFechaResponse caso : casos) {
            if (caso.reclamoIdGenerado() == null) {
                throw new IllegalStateException("Caso " + caso.id() + " no trae reclamo_id_generado.");
            }
            ids.add(caso.reclamoIdGenerado());
        }
        return ids;
    }

    private Map<Long, String> obtenerCodigosReclamoPorIds(Set<Long> ids) {
        Map<Long, String> codigos = new HashMap<>();
        if (ids.isEmpty()) {
            return codigos;
        }

        StringBuilder sql = new StringBuilder("SELECT id, codigo_reclamo FROM reclamos WHERE id IN (");
        List<Object> parametros = new ArrayList<>();
        int indice = 0;

        for (Long id : ids) {
            if (indice > 0) {
                sql.append(", ");
            }

            sql.append("?");
            parametros.add(id);
            indice++;
        }

        sql.append(");");

        generalJdbcTemplate.query(sql.toString(), rs -> {
            codigos.put(rs.getLong("id"), rs.getString("codigo_reclamo"));
        }, parametros.toArray());

        return codigos;
    }

    private String obtenerCodigoReclamoObligatorio(Map<Long, String> codigos, Long reclamoIdGenerado, Long casoId) {
        if (reclamoIdGenerado == null) {
            throw new IllegalStateException("Caso " + casoId + " no trae reclamo_id_generado.");
        }

        String codigo = codigos.get(reclamoIdGenerado);
        if (codigo == null || codigo.trim().isEmpty()) {
            throw new IllegalStateException(
                    "Caso " + casoId + " apunta a reclamo_id_generado " + reclamoIdGenerado + " pero no existe codigo_reclamo en la BD general."
            );
        }

        return codigo;
    }

    private CasoDerivacionResumenResponse conCodigoReclamo(CasoDerivacionResumenResponse caso, String codigoReclamo) {
        return new CasoDerivacionResumenResponse(
                caso.id(),
                caso.usuarioComentario(),
                caso.tipoIncidencia(),
                caso.areaDerivacion(),
                caso.prioridad(),
                caso.estadoCaso(),
                caso.cantidadEventos(),
                caso.reclamoEntranteIdGenerado(),
                caso.reclamoIdGenerado(),
                codigoReclamo,
                caso.clasificacionIdGenerada(),
                caso.usuarioAsignadoId(),
                caso.motivoDecision(),
                caso.confianza(),
                caso.fechaPrimerEvento(),
                caso.fechaUltimoEvento(),
                caso.createdAt(),
                caso.updatedAt()
        );
    }

    private CasoDerivacionFiltroFechaResponse conCodigoReclamo(CasoDerivacionFiltroFechaResponse caso, String codigoReclamo) {
        return new CasoDerivacionFiltroFechaResponse(
                caso.id(),
                caso.usuarioComentario(),
                caso.tipoIncidencia(),
                caso.areaDerivacion(),
                caso.prioridad(),
                caso.estadoCaso(),
                caso.cantidadEventos(),
                caso.reclamoEntranteIdGenerado(),
                caso.reclamoIdGenerado(),
                codigoReclamo,
                caso.clasificacionIdGenerada(),
                caso.usuarioAsignadoId(),
                caso.motivoDecision(),
                caso.confianza(),
                caso.fechaPrimerEvento(),
                caso.fechaUltimoEvento(),
                caso.diasHabilesTranscurridos(),
                caso.estadoTiempo(),
                caso.plataforma(),
                caso.urlPublicacion(),
                caso.textoResumen()
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
                null,
                obtenerLongNullable(rs, "clasificacion_id_generada"),
                obtenerLongNullable(rs, "usuario_asignado_id"),
                rs.getString("motivo_decision"),
                obtenerBigDecimalNullable(rs, "confianza"),
                obtenerOffsetDateTimeObligatorio(rs, "fecha_primer_evento"),
                obtenerOffsetDateTimeObligatorio(rs, "fecha_ultimo_evento"),
                obtenerOffsetDateTimeObligatorio(rs, "created_at"),
                obtenerOffsetDateTimeObligatorio(rs, "updated_at")
        );
    }

    private CasoDerivacionFiltroFechaResponse mapearCasoFiltroFechaBase(ResultSet rs, int rowNum) throws SQLException {
        return new CasoDerivacionFiltroFechaResponse(
                rs.getLong("id"),
                rs.getString("usuario_comentario"),
                rs.getString("tipo_incidencia"),
                rs.getString("area_derivacion"),
                rs.getString("prioridad"),
                rs.getString("estado_caso"),
                rs.getInt("cantidad_eventos"),
                obtenerLongNullable(rs, "reclamo_entrante_id_generado"),
                obtenerLongNullable(rs, "reclamo_id_generado"),
                null,
                obtenerLongNullable(rs, "clasificacion_id_generada"),
                obtenerLongNullable(rs, "usuario_asignado_id"),
                rs.getString("motivo_decision"),
                obtenerBigDecimalNullable(rs, "confianza"),
                obtenerOffsetDateTimeObligatorio(rs, "fecha_primer_evento"),
                obtenerOffsetDateTimeObligatorio(rs, "fecha_ultimo_evento"),
                null,
                null,
                rs.getString("plataforma_origen"),
                rs.getString("url_publicacion_origen"),
                rs.getString("texto_resumen")
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
                obtenerLocalDateObligatorio(rs, "fecha_comentario")
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
                obtenerOffsetDateTimeObligatorio(rs, "fecha_ultimo_evento")
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

    private OffsetDateTime obtenerOffsetDateTimeObligatorio(ResultSet rs, String columna) throws SQLException {
        OffsetDateTime valor = rs.getObject(columna, OffsetDateTime.class);
        if (valor == null) {
            throw new IllegalStateException("La columna obligatoria " + columna + " viene nula.");
        }

        return valor;
    }

    private LocalDate obtenerLocalDateObligatorio(ResultSet rs, String columna) throws SQLException {
        Date valor = rs.getDate(columna);
        if (valor == null) {
            throw new IllegalStateException("La columna obligatoria " + columna + " viene nula.");
        }

        return valor.toLocalDate();
    }

    private String vacioANull(String valor) {
        if (valor == null || valor.trim().isEmpty()) {
            return null;
        }

        return valor.trim();
    }
}