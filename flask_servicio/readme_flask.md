
## `readme_flask.md`

```md
# Flask Servicio - Análisis de sentimiento

Servicio Flask encargado de clasificar comentarios según polaridad utilizando un modelo entrenado basado en XLM-RoBERTa.

Este componente forma parte de una plataforma de centralización, análisis, jerarquización y derivación de reclamos no formales en canales digitales.

Su responsabilidad es recibir comentarios desde el microservicio de scraping y devolver una etiqueta de sentimiento para cada texto.

## Rol dentro del sistema general

El servicio Flask funciona como filtro inicial de análisis de sentimiento.

Flujo general:

```text
scraping_servidor
        ↓
comentarios capturados desde Instagram y TikTok
        ↓
flask_servicio /predecir
        ↓
clasificación de sentimiento
        ↓
comentarios negativos
        ↓
PostgreSQL
        ↓
derivador / backend / frontend