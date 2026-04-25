package cl.duoc.grupo1.ms_reclamos.repository;

import cl.duoc.grupo1.ms_reclamos.model.Reclamo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReclamoRepository extends JpaRepository<Reclamo, Long> {
}
