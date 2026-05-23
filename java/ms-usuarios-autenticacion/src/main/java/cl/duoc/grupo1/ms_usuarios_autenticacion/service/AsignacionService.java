package cl.duoc.grupo1.ms_usuarios_autenticacion.service;

import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.AsignacionResolverRequest;
import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.AsignacionResolverResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.UsuarioDisponibleResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.repository.AsignacionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class AsignacionService {

    private final AsignacionRepository asignacionRepository;

    public AsignacionService(AsignacionRepository asignacionRepository) {
        this.asignacionRepository = asignacionRepository;
    }

    public List<UsuarioDisponibleResponse> listarUsuariosDisponibles(String perfil) {
        return asignacionRepository.listarUsuariosDisponiblesPorPerfil(resolverPerfilDestino(perfil));
    }

    public AsignacionResolverResponse resolverAsignacion(AsignacionResolverRequest request) {
        String perfilDestino = resolverPerfilDestino(request.areaDerivacion());

        return asignacionRepository.resolverUsuarioDisponible(perfilDestino)
                .map(usuario -> new AsignacionResolverResponse(
                        true,
                        perfilDestino,
                        usuario.usuarioId(),
                        usuario.nombreUsuario(),
                        usuario.correoUsuario(),
                        usuario.cargaActual(),
                        usuario.limiteCarga(),
                        "Usuario disponible encontrado para el perfil " + perfilDestino + "."
                ))
                .orElseGet(() -> new AsignacionResolverResponse(
                        false,
                        perfilDestino,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "No hay trabajadores activos con cupo disponible para el perfil " + perfilDestino + "."
                ));
    }

    public String resolverPerfilDestino(String areaDerivacion) {
        String area = String.valueOf(areaDerivacion == null ? "" : areaDerivacion)
                .trim()
                .toUpperCase(Locale.ROOT);

        return switch (area) {
            case "SOPORTE_TECNICO" -> "SOPORTE_TECNICO";
            case "POSTVENTA" -> "POSTVENTA";
            case "OPERACIONES" -> "OPERACIONES";
            case "GERENCIA" -> "GERENCIA";
            case "ATENCION_CLIENTE" -> "ATENCION_CLIENTE";
            default -> "ATENCION_CLIENTE";
        };
    }
}
