package cl.duoc.grupo1.ms_reclamos.dto;

import java.time.OffsetDateTime;

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
        Integer likes,
        Integer replies,
        OffsetDateTime fechaScraping,
        String textoPublicacion,
        String urlOrigen,
        String rutaImagenLocal,
        String urlImagenOriginal
) {}
