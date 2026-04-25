package cl.duoc.grupo1.ms_integracion_multicanal.repository;

import cl.duoc.grupo1.ms_integracion_multicanal.model.CategoriaReclamo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CategoriaReclamoRepository extends JpaRepository<CategoriaReclamo, Long> {
    Optional<CategoriaReclamo> findByNombre(String nombre);
}
