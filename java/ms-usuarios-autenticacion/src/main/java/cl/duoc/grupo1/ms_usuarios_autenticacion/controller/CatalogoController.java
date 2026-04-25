package cl.duoc.grupo1.ms_usuarios_autenticacion.controller;

import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.CatalogoResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.service.CatalogoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class CatalogoController {

    private final CatalogoService catalogoService;

    public CatalogoController(CatalogoService catalogoService) {
        this.catalogoService = catalogoService;
    }

    @GetMapping("/roles")
    public List<CatalogoResponse> listarRoles() {
        return catalogoService.listarRoles();
    }

    @GetMapping("/perfiles")
    public List<CatalogoResponse> listarPerfiles() {
        return catalogoService.listarPerfiles();
    }
}
