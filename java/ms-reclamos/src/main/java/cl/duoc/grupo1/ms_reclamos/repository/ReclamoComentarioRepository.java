package cl.duoc.grupo1.ms_reclamos.repository;

import cl.duoc.grupo1.ms_reclamos.model.ReclamoComentario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReclamoComentarioRepository extends JpaRepository<ReclamoComentario, Long> {
    List<ReclamoComentario> findByReclamoIdOrderByFechaCreacionAsc(Long reclamoId);
}
