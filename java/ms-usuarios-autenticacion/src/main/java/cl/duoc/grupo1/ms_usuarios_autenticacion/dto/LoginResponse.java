package cl.duoc.grupo1.ms_usuarios_autenticacion.dto;

public record LoginResponse(
        String token,
        String tipo,
        UsuarioResponse usuario
) {}
