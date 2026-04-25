package cl.duoc.grupo1.ms_usuarios_autenticacion.controller;

import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/health")
    public HealthResponse health() {
        return new HealthResponse("ms-usuarios-autenticacion", "OK");
    }
}
