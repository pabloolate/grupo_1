package cl.duoc.grupo1.ms_integracion_multicanal.repository;

import cl.duoc.grupo1.ms_integracion_multicanal.model.PrioridadReclamo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PrioridadReclamoRepository extends JpaRepository<PrioridadReclamo, Long> {
    Optional<PrioridadReclamo> findByNombre(String nombre);
}
