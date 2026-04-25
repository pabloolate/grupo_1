package cl.duoc.grupo1.ms_integracion_multicanal.repository;

import cl.duoc.grupo1.ms_integracion_multicanal.model.EstadoReclamo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EstadoReclamoRepository extends JpaRepository<EstadoReclamo, Long> {
    Optional<EstadoReclamo> findByNombre(String nombre);
}
