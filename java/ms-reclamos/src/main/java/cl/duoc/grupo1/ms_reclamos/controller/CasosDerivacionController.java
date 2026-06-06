package cl.duoc.grupo1.ms_reclamos.controller;

import cl.duoc.grupo1.ms_reclamos.dto.*;
import cl.duoc.grupo1.ms_reclamos.service.CasosDerivacionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/casos-derivacion")
public class CasosDerivacionController {

    private final CasosDerivacionService casosDerivacionService;

    public CasosDerivacionController(CasosDerivacionService casosDerivacionService) {
        this.casosDerivacionService = casosDerivacionService;
    }

    @GetMapping
    public List<CasoDerivacionResumenResponse> listar(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String prioridad,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String usuario
    ) {
        return casosDerivacionService.listarCasos(estado, area, prioridad, tipo, usuario);
    }

    @GetMapping("/filtro-fechas")
    public List<CasoDerivacionFiltroFechaResponse> listarPorFiltroFechas(
            @RequestParam(required = false) String estadoTiempo,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) String plataforma,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String prioridad,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String usuario
    ) {
        return casosDerivacionService.listarCasosPorFiltroFechas(
                estadoTiempo,
                desde,
                hasta,
                plataforma,
                area,
                prioridad,
                tipo,
                usuario
        );
    }

    @GetMapping("/{id}")
    public CasoDerivacionDetalleResponse obtenerDetalle(@PathVariable Long id) {
        return casosDerivacionService.obtenerDetalle(id);
    }

    @GetMapping("/{id}/comentarios")
    public List<ComentarioCasoDerivacionResponse> obtenerComentarios(@PathVariable Long id) {
        return casosDerivacionService.obtenerComentarios(id);
    }

    @PatchMapping("/{id}/estado")
    public CasoDerivacionResumenResponse cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambiarEstadoCasoRequest request) {
        return casosDerivacionService.cambiarEstado(id, request);
    }

    @PatchMapping("/{id}/asignar")
    public CasoDerivacionResumenResponse asignarCaso(@PathVariable Long id, @Valid @RequestBody AsignarCasoRequest request) {
        return casosDerivacionService.asignarCaso(id, request);
    }

    @GetMapping("/catalogo-tipos")
    public List<CatalogoTipoIncidenciaResponse> listarCatalogoTipos() {
        return casosDerivacionService.listarCatalogoTipos();
    }
}
