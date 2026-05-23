package cl.duoc.grupo1.ms_reclamos.controller;

import cl.duoc.grupo1.ms_reclamos.dto.CasoDerivacionResumenResponse;
import cl.duoc.grupo1.ms_reclamos.dto.UsuarioReclamanteResumenResponse;
import cl.duoc.grupo1.ms_reclamos.service.CasosDerivacionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/usuarios-reclamantes")
public class UsuariosReclamantesController {

    private final CasosDerivacionService casosDerivacionService;

    public UsuariosReclamantesController(CasosDerivacionService casosDerivacionService) {
        this.casosDerivacionService = casosDerivacionService;
    }

    @GetMapping
    public List<UsuarioReclamanteResumenResponse> listar(@RequestParam(required = false) String estado) {
        return casosDerivacionService.listarUsuariosReclamantes(estado);
    }

    @GetMapping("/{usuario}/casos")
    public List<CasoDerivacionResumenResponse> listarCasosUsuario(@PathVariable String usuario) {
        return casosDerivacionService.listarCasosPorUsuario(usuario);
    }
}
