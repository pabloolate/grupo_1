package cl.duoc.grupo1.ms_integracion_multicanal.repository;

import cl.duoc.grupo1.ms_integracion_multicanal.model.ReclamoEntrante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReclamoEntranteRepository extends JpaRepository<ReclamoEntrante, Long> {
    List<ReclamoEntrante> findTop50ByOrderByIdDesc();
}
