package cl.duoc.grupo1.ms_reclamos.repository;

import cl.duoc.grupo1.ms_reclamos.model.EstadoReclamo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EstadoReclamoRepository extends JpaRepository<EstadoReclamo, Long> {
    Optional<EstadoReclamo> findByNombreIgnoreCase(String nombre);
}
