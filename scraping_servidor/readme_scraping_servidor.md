
## `readme_scraping_servidor.md`

```md
# Microservicio de scraping y captura de reclamos no formales

Node.js

Microservicio encargado de capturar comentarios públicos desde Instagram y TikTok, normalizarlos, enviarlos al servicio Flask de análisis de sentimiento y persistir en base de datos aquellos comentarios negativos que pueden representar reclamos no formales.

Este componente forma parte de una plataforma general de centralización, análisis, jerarquización y derivación de reclamos digitales.

## Responsabilidad principal

La responsabilidad principal de este módulo es obtener datos desde canales digitales no formales y transformarlos en registros iniciales para el flujo de reclamos.

Actualmente trabaja con:

- Instagram posts.
- Instagram reels.
- TikTok.

Su función es capturar publicaciones y comentarios, preparar los textos, consultar el servicio de análisis de sentimiento y guardar únicamente los comentarios clasificados como negativos.

## Objetivo dentro de la arquitectura

El propósito de este microservicio es alimentar la base inicial de reclamos no formales detectados en redes sociales.

Dentro de la arquitectura general, funciona como la primera capa del flujo:

```text
Canales digitales
        ↓
Scraping
        ↓
Análisis de sentimiento
        ↓
Comentarios negativos
        ↓
Base de datos
        ↓
Derivador / backend / frontend