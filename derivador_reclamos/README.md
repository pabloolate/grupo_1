# Derivador de Reclamos

Servicio Node.js encargado de tomar comentarios negativos ya detectados por el flujo de scraping y sentimentalización, clasificarlos por tipo de incidencia, agruparlos por usuario cuando corresponde y generar casos estructurados para su posterior gestión en el sistema central de reclamos.

Este componente forma parte de una plataforma general de centralización, análisis, jerarquización y derivación de reclamos no formales provenientes de canales digitales.

## Rol dentro del sistema general

El derivador se ejecuta después del scraping y del análisis de sentimiento.

Flujo general:

```text
Instagram / TikTok
        ↓
scraping_servidor
        ↓
flask_servicio
        ↓
PostgreSQL - comentarios_negativos
        ↓
derivador_reclamos
        ↓
casos_derivacion
        ↓
BD general de reclamos
        ↓
backend / frontend / plataformas reales de atención