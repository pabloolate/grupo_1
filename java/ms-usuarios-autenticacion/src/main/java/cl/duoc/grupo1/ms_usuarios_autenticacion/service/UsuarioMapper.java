package cl.duoc.grupo1.ms_usuarios_autenticacion.service;

import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.UsuarioResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.model.Usuario;
import org.springframework.stereotype.Component;

@Component
public class UsuarioMapper {

    public UsuarioResponse toResponse(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getRol().getNombre(),
                usuario.getPerfil().getNombre(),
                usuario.getActivo()
        );
    }
}
