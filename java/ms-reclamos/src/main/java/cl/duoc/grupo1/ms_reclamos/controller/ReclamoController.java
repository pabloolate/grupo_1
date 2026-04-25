package cl.duoc.grupo1.ms_reclamos.controller;

import cl.duoc.grupo1.ms_reclamos.dto.*;
import cl.duoc.grupo1.ms_reclamos.service.ReclamoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/reclamos")
public class ReclamoController {

    private final ReclamoService reclamoService;

    @GetMapping
    public List<ReclamoResumenResponse> listarReclamos() {
        return reclamoService.listarReclamos();
    }

    @GetMapping("/{id}")
    public ReclamoDetalleResponse obtenerDetalle(@PathVariable Long id) {
        return reclamoService.obtenerDetalle(id);
    }

    @GetMapping("/{id}/historial")
    public List<ReclamoHistorialResponse> obtenerHistorial(@PathVariable Long id) {
        return reclamoService.obtenerHistorial(id);
    }

    @GetMapping("/{id}/comentarios")
    public List<ReclamoComentarioResponse> obtenerComentarios(@PathVariable Long id) {
        return reclamoService.obtenerComentarios(id);
    }

    @GetMapping("/{id}/clasificacion-ia")
    public List<ReclamoClasificacionIaResponse> obtenerClasificacionesIa(@PathVariable Long id) {
        return reclamoService.obtenerClasificacionesIa(id);
    }

    @PatchMapping("/{id}/estado")
    public ReclamoDetalleResponse cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambiarEstadoRequest request) {
        return reclamoService.cambiarEstado(id, request);
    }

    @PatchMapping("/{id}/asignar")
    public ReclamoDetalleResponse asignarReclamo(@PathVariable Long id, @Valid @RequestBody AsignarReclamoRequest request) {
        return reclamoService.asignarReclamo(id, request);
    }

    @PostMapping("/{id}/comentarios")
    public ReclamoComentarioResponse agregarComentario(@PathVariable Long id, @Valid @RequestBody CrearComentarioRequest request) {
        return reclamoService.agregarComentario(id, request);
    }

    @GetMapping("/health")
    public Map<String, String> healthReclamos() {
        return Map.of("status", "OK", "servicio", "ms-reclamos");
    }
}
