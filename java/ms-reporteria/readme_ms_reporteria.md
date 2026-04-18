# MS Reportería

Microservicio encargado de la generación de reportes, métricas y visualización operativa del sistema de reclamos.

## Responsabilidad principal

Entregar una visión consolidada del funcionamiento de la plataforma a través de indicadores, estadísticas y reportes útiles para la operación y la toma de decisiones.

## Funciones esperadas

- generación de reportes
- visualización de métricas
- conteo de reclamos por estado
- análisis de volúmenes
- seguimiento de tiempos de atención
- apoyo a paneles de control
- consulta de información histórica

## Objetivo dentro de la arquitectura

Separar la reportería de la operación transaccional permite mantener una arquitectura más clara, donde la observación del sistema no se mezcla con la gestión directa del reclamo.

## Base técnica

Desarrollado como microservicio independiente dentro de la capa principal de negocio.

## Relación con otros microservicios

- obtiene datos desde `ms-reclamos`
- se apoya en `ms-usuarios-autenticacion` para control de acceso
- puede incorporar resultados agregados del servicio de IA

## Importancia dentro del proyecto

Permite medir el comportamiento del sistema, apoyar la supervisión operativa y facilitar la toma de decisiones.