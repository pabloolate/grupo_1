package cl.duoc.grupo1.ms_usuarios_autenticacion.security;

import cl.duoc.grupo1.ms_usuarios_autenticacion.model.Usuario;
import cl.duoc.grupo1.ms_usuarios_autenticacion.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UsuarioRepository usuarioRepository) {
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authorization.substring(7);

        if (!jwtService.tokenValido(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        String correo = jwtService.obtenerCorreo(token);
        if (correo == null || SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        usuarioRepository.findByCorreoIgnoreCase(correo)
                .filter(usuario -> Boolean.TRUE.equals(usuario.getActivo()))
                .ifPresent(usuario -> autenticar(usuario, token));

        filterChain.doFilter(request, response);
    }

    private void autenticar(Usuario usuario, String token) {
        List<SimpleGrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + usuario.getRol().getNombre())
        );

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(usuario.getCorreo(), token, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
