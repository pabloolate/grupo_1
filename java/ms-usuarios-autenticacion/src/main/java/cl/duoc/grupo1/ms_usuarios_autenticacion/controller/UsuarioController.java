package cl.duoc.grupo1.ms_usuarios_autenticacion.controller;

import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.UsuarioResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.service.UsuarioService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public List<UsuarioResponse> listar() {
        return usuarioService.listarUsuarios();
    }

    @GetMapping("/{id}")
    public UsuarioResponse obtener(@PathVariable Long id) {
        return usuarioService.obtenerPorId(id);
    }
}
