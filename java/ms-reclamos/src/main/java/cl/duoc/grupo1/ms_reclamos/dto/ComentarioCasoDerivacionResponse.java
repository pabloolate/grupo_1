package cl.duoc.grupo1.ms_reclamos.dto;

import java.time.LocalDate;

public record ComentarioCasoDerivacionResponse(
        Long comentarioNegativoId,
        Long publicacionId,
        String plataforma,
        String tipoPublicacion,
        String urlPublicacion,
        String usuarioComentario,
        String textoComentario,
        String sentimiento,
        Integer puntaje,
        LocalDate fechaComentario
) {}
