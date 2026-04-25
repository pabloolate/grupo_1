package cl.duoc.grupo1.ms_usuarios_autenticacion.repository;

import cl.duoc.grupo1.ms_usuarios_autenticacion.model.Perfil;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PerfilRepository extends JpaRepository<Perfil, Long> {
    Optional<Perfil> findByNombre(String nombre);
    List<Perfil> findByActivoTrueOrderByNombreAsc();
}
