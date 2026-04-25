package cl.duoc.grupo1.ms_usuarios_autenticacion.controller;

import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.LoginRequest;
import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.LoginResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.UsuarioResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.service.AuthService;
import cl.duoc.grupo1.ms_usuarios_autenticacion.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final UsuarioService usuarioService;

    public AuthController(AuthService authService, UsuarioService usuarioService) {
        this.authService = authService;
        this.usuarioService = usuarioService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UsuarioResponse me(Authentication authentication) {
        return usuarioService.obtenerPorCorreo(authentication.getName());
    }
}
