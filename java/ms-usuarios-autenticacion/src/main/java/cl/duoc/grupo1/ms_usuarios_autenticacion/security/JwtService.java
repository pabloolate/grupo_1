package cl.duoc.grupo1.ms_usuarios_autenticacion.security;

import cl.duoc.grupo1.ms_usuarios_autenticacion.model.Usuario;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String jwtSecret;
    private final long expirationMinutes;

    public JwtService(
            @Value("${app.security.jwt-secret}") String jwtSecret,
            @Value("${app.security.jwt-expiration-minutes}") long expirationMinutes
    ) {
        this.jwtSecret = jwtSecret;
        this.expirationMinutes = expirationMinutes;
    }

    public String generarToken(Usuario usuario) {
        long emitidoEn = Instant.now().getEpochSecond();
        long expiraEn = emitidoEn + expirationMinutes * 60;

        Map<String, Object> header = new LinkedHashMap<>();
        header.put("alg", "HS256");
        header.put("typ", "JWT");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", usuario.getCorreo());
        payload.put("id", usuario.getId());
        payload.put("nombre", usuario.getNombre());
        payload.put("correo", usuario.getCorreo());
        payload.put("rol", usuario.getRol().getNombre());
        payload.put("perfil", usuario.getPerfil().getNombre());
        payload.put("iat", emitidoEn);
        payload.put("exp", expiraEn);

        String headerBase64 = codificarJson(header);
        String payloadBase64 = codificarJson(payload);
        String contenido = headerBase64 + "." + payloadBase64;
        return contenido + "." + firmar(contenido);
    }

    public boolean tokenValido(String token) {
        try {
            Map<String, Object> claims = obtenerClaims(token);
            Number exp = (Number) claims.get("exp");
            return exp != null && exp.longValue() > Instant.now().getEpochSecond();
        } catch (Exception error) {
            return false;
        }
    }

    public String obtenerCorreo(String token) {
        Map<String, Object> claims = obtenerClaims(token);
        Object correo = claims.get("correo");
        return correo == null ? null : correo.toString();
    }

    public Map<String, Object> obtenerClaims(String token) {
        try {
            String[] partes = token.split("\\.");
            if (partes.length != 3) {
                throw new IllegalArgumentException("Token JWT inválido");
            }

            String contenido = partes[0] + "." + partes[1];
            String firmaEsperada = firmar(contenido);
            if (!firmaEsperada.equals(partes[2])) {
                throw new IllegalArgumentException("Firma JWT inválida");
            }

            byte[] payloadBytes = Base64.getUrlDecoder().decode(partes[1]);
            return objectMapper.readValue(payloadBytes, new TypeReference<>() {});
        } catch (Exception error) {
            throw new IllegalArgumentException("No se pudo leer el token JWT", error);
        }
    }

    private String codificarJson(Map<String, Object> data) {
        try {
            byte[] json = objectMapper.writeValueAsBytes(data);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(json);
        } catch (Exception error) {
            throw new IllegalStateException("No se pudo codificar JWT", error);
        }
    }

    private String firmar(String contenido) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(keySpec);
            byte[] firma = mac.doFinal(contenido.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(firma);
        } catch (Exception error) {
            throw new IllegalStateException("No se pudo firmar JWT", error);
        }
    }
}
