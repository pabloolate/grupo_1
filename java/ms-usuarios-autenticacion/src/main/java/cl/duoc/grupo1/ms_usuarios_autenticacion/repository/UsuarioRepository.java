package cl.duoc.grupo1.ms_usuarios_autenticacion.repository;

import cl.duoc.grupo1.ms_usuarios_autenticacion.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByCorreoIgnoreCase(String correo);
    boolean existsByCorreoIgnoreCase(String correo);
    List<Usuario> findAllByOrderByIdAsc();
}
