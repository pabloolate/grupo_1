package cl.duoc.grupo1.ms_reclamos.repository;

import cl.duoc.grupo1.ms_reclamos.model.ReclamoClasificacionIa;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReclamoClasificacionIaRepository extends JpaRepository<ReclamoClasificacionIa, Long> {
    List<ReclamoClasificacionIa> findByReclamoIdOrderByFechaClasificacionDesc(Long reclamoId);
    Optional<ReclamoClasificacionIa> findFirstByReclamoIdOrderByFechaClasificacionDesc(Long reclamoId);
}
