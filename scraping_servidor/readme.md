# MS Integración multicanal

Microservicio encargado de la recepción, centralización y normalización de reclamos provenientes de distintos canales digitales.

## Responsabilidad principal

Este módulo actúa como puerta de entrada de reclamos desde diferentes fuentes, tales como:

- redes sociales
- mensajería
- formularios web
- correo electrónico

Su función es capturar la información, estandarizarla y dejarla preparada para que el resto de la plataforma pueda procesarla de forma uniforme.

## Objetivo dentro de la arquitectura

El propósito de este microservicio es resolver la heterogeneidad de los canales de entrada. Cada plataforma entrega datos en formatos distintos, por lo que este componente unifica la estructura base del reclamo antes de derivarlo a la capa de negocio.

## Funciones esperadas

- recepción de reclamos desde múltiples canales
- normalización de campos
- limpieza básica de texto
- estandarización de estructura de entrada
- preparación de datos para clasificación y priorización
- integración con el servicio de IA cuando corresponda

## Base técnica

Este componente se apoya en lógica de scraping e integración multicanal, y se conecta con el servicio Flask de clasificación cuando se requiere apoyo de IA.

## Relación con otros microservicios

- entrega información al microservicio de reclamos
- puede apoyarse en el servicio Flask para clasificación inicial
- sirve como capa previa a la lógica de negocio en Java

## Estado dentro del proyecto

Este módulo representa la capa de integración de entrada del sistema y forma parte de la arquitectura general de reclamos omnicanal para retail mediano.