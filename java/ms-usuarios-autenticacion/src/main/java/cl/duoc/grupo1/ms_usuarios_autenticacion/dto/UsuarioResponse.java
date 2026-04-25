package cl.duoc.grupo1.ms_usuarios_autenticacion.dto;

public record UsuarioResponse(
        Long id,
        String nombre,
        String correo,
        String rol,
        String perfil,
        Boolean activo
) {}
