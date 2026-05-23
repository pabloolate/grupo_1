package cl.duoc.grupo1.ms_usuarios_autenticacion.repository;

import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.UsuarioDisponibleResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Repository
public class AsignacionRepository {

    private final JdbcTemplate jdbcTemplate;

    public AsignacionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<UsuarioDisponibleResponse> listarUsuariosDisponiblesPorPerfil(String perfilDestino) {
        String perfil = normalizar(perfilDestino);

        String sql = """
            WITH perfil_objetivo AS (
              SELECT id, nombre
              FROM perfiles
              WHERE UPPER(nombre) = ?
                AND activo = true
              LIMIT 1
            ),
            limite AS (
              SELECT COALESCE((
                SELECT c.limite_casos_abiertos
                FROM configuracion_carga_perfil c
                WHERE c.perfil_id = (SELECT id FROM perfil_objetivo)
                  AND c.activo = true
                LIMIT 1
              ), 10) AS limite_casos_abiertos
            ),
            estados_cerrados AS (
              SELECT id
              FROM estados_reclamo
              WHERE COALESCE(es_estado_final, false) = true
            ),
            carga AS (
              SELECT
                u.id AS usuario_id,
                u.nombre AS nombre_usuario,
                u.correo AS correo_usuario,
                p.nombre AS perfil,
                r.nombre AS rol,
                COUNT(rec.id)::int AS carga_actual,
                (SELECT limite_casos_abiertos FROM limite)::int AS limite_carga
              FROM usuarios u
              JOIN perfiles p ON p.id = u.perfil_id
              JOIN roles r ON r.id = u.rol_id
              LEFT JOIN reclamos rec
                ON rec.usuario_asignado_id = u.id
               AND rec.estado_id NOT IN (SELECT id FROM estados_cerrados)
              WHERE u.activo = true
                AND p.id = (SELECT id FROM perfil_objetivo)
                AND UPPER(r.nombre) = 'TRABAJADOR'
              GROUP BY u.id, u.nombre, u.correo, p.nombre, r.nombre
            )
            SELECT
              usuario_id,
              nombre_usuario,
              correo_usuario,
              perfil,
              rol,
              carga_actual,
              limite_carga,
              (carga_actual < limite_carga) AS disponible
            FROM carga
            ORDER BY disponible DESC, carga_actual ASC, usuario_id ASC;
            """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> new UsuarioDisponibleResponse(
                rs.getLong("usuario_id"),
                rs.getString("nombre_usuario"),
                rs.getString("correo_usuario"),
                rs.getString("perfil"),
                rs.getString("rol"),
                rs.getInt("carga_actual"),
                rs.getInt("limite_carga"),
                rs.getBoolean("disponible")
        ), perfil);
    }

    public Optional<UsuarioDisponibleResponse> resolverUsuarioDisponible(String perfilDestino) {
        return listarUsuariosDisponiblesPorPerfil(perfilDestino)
                .stream()
                .filter(UsuarioDisponibleResponse::disponible)
                .findFirst();
    }

    private String normalizar(String valor) {
        return String.valueOf(valor == null ? "" : valor).trim().toUpperCase(Locale.ROOT);
    }
}
