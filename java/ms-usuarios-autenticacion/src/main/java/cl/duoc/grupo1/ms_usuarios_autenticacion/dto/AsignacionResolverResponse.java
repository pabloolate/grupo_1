package cl.duoc.grupo1.ms_usuarios_autenticacion.dto;

public record AsignacionResolverResponse(
        Boolean asignable,
        String perfilDestino,
        Long usuarioAsignadoId,
        String nombreUsuario,
        String correoUsuario,
        Integer cargaActual,
        Integer limiteCarga,
        String motivo
) {}
