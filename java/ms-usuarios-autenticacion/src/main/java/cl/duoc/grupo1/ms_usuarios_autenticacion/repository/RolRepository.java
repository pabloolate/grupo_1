package cl.duoc.grupo1.ms_usuarios_autenticacion.repository;

import cl.duoc.grupo1.ms_usuarios_autenticacion.model.Rol;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RolRepository extends JpaRepository<Rol, Long> {
    Optional<Rol> findByNombre(String nombre);
    List<Rol> findByActivoTrueOrderByNombreAsc();
}
