package cl.duoc.grupo1.ms_usuarios_autenticacion.dto;

public record UsuarioDisponibleResponse(
        Long usuarioId,
        String nombreUsuario,
        String correoUsuario,
        String perfil,
        String rol,
        Integer cargaActual,
        Integer limiteCarga,
        Boolean disponible
) {}
