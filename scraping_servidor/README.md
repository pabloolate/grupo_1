# Scraping Servidor - Captura de reclamos no formales

Microservicio Node.js encargado de capturar comentarios públicos desde Instagram y TikTok, enviarlos al servicio Flask de análisis de sentimiento y persistir en PostgreSQL las publicaciones que contienen comentarios negativos.

Este componente forma parte de una plataforma mayor de centralización, análisis, jerarquización y derivación de reclamos no formales en canales digitales.

Su función no es resolver reclamos ni derivarlos directamente a una plataforma final. Su responsabilidad es alimentar la base operacional con comentarios negativos detectados desde redes sociales, dejando la información preparada para las etapas posteriores del sistema.

## Alcance actual

El alcance actual del microservicio considera:

- Instagram posts.
- Instagram reels.
- TikTok.
- Captura de publicaciones.
- Captura de comentarios.
- Captura de fechas de comentarios.
- Envío de comentarios al servicio Flask de sentimentalización.
- Filtro de comentarios negativos.
- Persistencia en PostgreSQL.
- Guardado local de imágenes o capturas cuando corresponde.

Otros canales como WhatsApp, correo, formularios web, Facebook, CRM o call center quedan considerados como evolución futura del sistema general, pero no forman parte de este microservicio en su versión actual.

## Rol dentro del sistema general

Este módulo actúa como capa de captura y prefiltrado.

Flujo general:

```text
Instagram / TikTok
        ↓
scraping_servidor
        ↓
normalización de publicaciones y comentarios
        ↓
flask_servicio /predecir
        ↓
filtrado de comentarios negativos
        ↓
PostgreSQL
        ↓
derivador / backend / frontend