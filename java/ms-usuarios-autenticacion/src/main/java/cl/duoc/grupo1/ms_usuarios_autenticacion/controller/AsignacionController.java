package cl.duoc.grupo1.ms_usuarios_autenticacion.controller;

import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.AsignacionResolverRequest;
import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.AsignacionResolverResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.UsuarioDisponibleResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.service.AsignacionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/asignacion")
public class AsignacionController {

    private final AsignacionService asignacionService;

    public AsignacionController(AsignacionService asignacionService) {
        this.asignacionService = asignacionService;
    }

    @PostMapping("/resolver")
    public AsignacionResolverResponse resolver(@Valid @RequestBody AsignacionResolverRequest request) {
        return asignacionService.resolverAsignacion(request);
    }

    @GetMapping("/perfiles/{perfil}/usuarios-disponibles")
    public List<UsuarioDisponibleResponse> listarUsuariosDisponibles(@PathVariable String perfil) {
        return asignacionService.listarUsuariosDisponibles(perfil);
    }
}
