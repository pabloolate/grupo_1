package cl.duoc.grupo1.ms_integracion_multicanal.controller;

import cl.duoc.grupo1.ms_integracion_multicanal.dto.CanalResponse;
import cl.duoc.grupo1.ms_integracion_multicanal.dto.CrearReclamoRequest;
import cl.duoc.grupo1.ms_integracion_multicanal.dto.ReclamoCreadoResponse;
import cl.duoc.grupo1.ms_integracion_multicanal.dto.ReclamoEntranteResponse;
import cl.duoc.grupo1.ms_integracion_multicanal.service.IntegracionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/integracion")
public class IntegracionController {

    private final IntegracionService integracionService;

    public IntegracionController(IntegracionService integracionService) {
        this.integracionService = integracionService;
    }

    @GetMapping("/canales")
    public ResponseEntity<List<CanalResponse>> listarCanales() {
        return ResponseEntity.ok(integracionService.listarCanales());
    }

    @PostMapping("/formulario")
    public ResponseEntity<ReclamoCreadoResponse> recibirFormulario(@Valid @RequestBody CrearReclamoRequest request) {
        return ResponseEntity.ok(integracionService.recibirFormulario(request));
    }

    @PostMapping("/correo")
    public ResponseEntity<ReclamoCreadoResponse> recibirCorreo(@Valid @RequestBody CrearReclamoRequest request) {
        return ResponseEntity.ok(integracionService.recibirCorreo(request));
    }

    @PostMapping("/red-social")
    public ResponseEntity<ReclamoCreadoResponse> recibirRedSocial(@Valid @RequestBody CrearReclamoRequest request) {
        return ResponseEntity.ok(integracionService.recibirRedSocial(request));
    }

    @PostMapping("/manual")
    public ResponseEntity<ReclamoCreadoResponse> recibirManual(@Valid @RequestBody CrearReclamoRequest request) {
        return ResponseEntity.ok(integracionService.recibirManual(request));
    }

    @GetMapping("/entrantes")
    public ResponseEntity<List<ReclamoEntranteResponse>> listarEntrantes() {
        return ResponseEntity.ok(integracionService.listarEntrantes());
    }

    @GetMapping("/entrantes/{id}")
    public ResponseEntity<ReclamoEntranteResponse> obtenerEntrante(@PathVariable Long id) {
        return ResponseEntity.ok(integracionService.obtenerEntrante(id));
    }
}
