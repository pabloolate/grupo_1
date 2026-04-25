package cl.duoc.grupo1.ms_usuarios_autenticacion.service;

import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.UsuarioResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.model.Usuario;
import cl.duoc.grupo1.ms_usuarios_autenticacion.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioMapper usuarioMapper;

    public UsuarioService(UsuarioRepository usuarioRepository, UsuarioMapper usuarioMapper) {
        this.usuarioRepository = usuarioRepository;
        this.usuarioMapper = usuarioMapper;
    }

    public List<UsuarioResponse> listarUsuarios() {
        return usuarioRepository.findAllByOrderByIdAsc()
                .stream()
                .map(usuarioMapper::toResponse)
                .toList();
    }

    public UsuarioResponse obtenerPorId(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return usuarioMapper.toResponse(usuario);
    }

    public UsuarioResponse obtenerPorCorreo(String correo) {
        Usuario usuario = usuarioRepository.findByCorreoIgnoreCase(correo)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return usuarioMapper.toResponse(usuario);
    }
}
