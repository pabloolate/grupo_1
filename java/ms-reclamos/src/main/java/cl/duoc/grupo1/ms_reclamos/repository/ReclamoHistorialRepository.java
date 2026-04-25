package cl.duoc.grupo1.ms_reclamos.repository;

import cl.duoc.grupo1.ms_reclamos.model.ReclamoHistorial;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReclamoHistorialRepository extends JpaRepository<ReclamoHistorial, Long> {
    List<ReclamoHistorial> findByReclamoIdOrderByFechaCreacionDesc(Long reclamoId);
}
