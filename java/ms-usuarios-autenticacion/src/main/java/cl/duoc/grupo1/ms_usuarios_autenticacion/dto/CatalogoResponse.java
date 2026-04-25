package cl.duoc.grupo1.ms_usuarios_autenticacion.dto;

public record CatalogoResponse(
        Long id,
        String nombre,
        String descripcion,
        Boolean activo
) {}
