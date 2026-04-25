package cl.duoc.grupo1.ms_reclamos.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "estados_reclamo")
public class EstadoReclamo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(nullable = false)
    private Integer orden;

    @Column(name = "es_estado_final", nullable = false)
    private Boolean esEstadoFinal;

    @Column(nullable = false)
    private Boolean activo;
}
