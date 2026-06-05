# Microservicios Java - Gestión centralizada de reclamos

Conjunto de microservicios desarrollados en Java con Spring Boot para administrar la capa backend de una plataforma de centralización, análisis, jerarquización y derivación de reclamos no formales provenientes de canales digitales.

Estos microservicios consumen y exponen información generada previamente por el flujo de scraping, análisis de sentimiento y derivación inicial. Su función es permitir autenticación, gestión de reclamos, integración de canales, reportería, visualización operativa y administración de casos.

## Rol dentro del sistema general

El sistema completo sigue este flujo conceptual:

```text
Instagram / TikTok
        ↓
scraping_servidor
        ↓
flask_servicio
        ↓
comentarios_negativos
        ↓
derivador_reclamos
        ↓
casos_derivacion / reclamos
        ↓
microservicios Java
        ↓
frontend
        ↓
plataformas reales de atención