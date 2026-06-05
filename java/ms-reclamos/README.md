
## `ms-reclamos/README.md`

```md
# ms-reclamos

Microservicio Spring Boot encargado de consultar, administrar y exponer reclamos y casos de derivación.

Este componente forma parte de la capa backend de una plataforma general de centralización, análisis, jerarquización y derivación de reclamos no formales.

## Rol dentro del sistema

El microservicio `ms-reclamos` permite operar reclamos ya creados por el flujo previo del sistema.

Flujo conceptual:

```text
scraping_servidor
        ↓
flask_servicio
        ↓
derivador_reclamos
        ↓
casos_derivacion / reclamos
        ↓
ms-reclamos
        ↓
frontend