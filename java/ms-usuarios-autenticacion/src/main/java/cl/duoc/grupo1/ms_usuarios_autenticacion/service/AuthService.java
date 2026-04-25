package cl.duoc.grupo1.ms_usuarios_autenticacion.service;

import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.LoginRequest;
import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.LoginResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.model.Usuario;
import cl.duoc.grupo1.ms_usuarios_autenticacion.repository.UsuarioRepository;
import cl.duoc.grupo1.ms_usuarios_autenticacion.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UsuarioMapper usuarioMapper;
    private final String passwordPepper;

    public AuthService(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            UsuarioMapper usuarioMapper,
            @Value("${app.security.password-pepper}") String passwordPepper
    ) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.usuarioMapper = usuarioMapper;
        this.passwordPepper = passwordPepper;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByCorreoIgnoreCase(request.correo())
                .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));

        if (!Boolean.TRUE.equals(usuario.getActivo())) {
            throw new BadCredentialsException("Usuario inactivo");
        }

        boolean passwordOk = passwordEncoder.matches(request.password() + passwordPepper, usuario.getPasswordHash());
        if (!passwordOk) {
            throw new BadCredentialsException("Credenciales inválidas");
        }

        usuario.setUltimoLogin(LocalDateTime.now());
        usuario.setFechaActualizacion(LocalDateTime.now());
        usuarioRepository.save(usuario);

        String token = jwtService.generarToken(usuario);
        return new LoginResponse(token, "Bearer", usuarioMapper.toResponse(usuario));
    }
}
