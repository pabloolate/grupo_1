package cl.duoc.grupo1.ms_usuarios_autenticacion.service;

import cl.duoc.grupo1.ms_usuarios_autenticacion.dto.CatalogoResponse;
import cl.duoc.grupo1.ms_usuarios_autenticacion.repository.PerfilRepository;
import cl.duoc.grupo1.ms_usuarios_autenticacion.repository.RolRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CatalogoService {

    private final RolRepository rolRepository;
    private final PerfilRepository perfilRepository;

    public CatalogoService(RolRepository rolRepository, PerfilRepository perfilRepository) {
        this.rolRepository = rolRepository;
        this.perfilRepository = perfilRepository;
    }

    public List<CatalogoResponse> listarRoles() {
        return rolRepository.findByActivoTrueOrderByNombreAsc()
                .stream()
                .map(rol -> new CatalogoResponse(rol.getId(), rol.getNombre(), rol.getDescripcion(), rol.getActivo()))
                .toList();
    }

    public List<CatalogoResponse> listarPerfiles() {
        return perfilRepository.findByActivoTrueOrderByNombreAsc()
                .stream()
                .map(perfil -> new CatalogoResponse(perfil.getId(), perfil.getNombre(), perfil.getDescripcion(), perfil.getActivo()))
                .toList();
    }
}
