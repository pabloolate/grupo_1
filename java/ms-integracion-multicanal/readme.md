# MS Integración multicanal

Microservicio encargado de la recepción, centralización y normalización de reclamos provenientes de distintos canales digitales.

## Responsabilidad principal

Este microservicio recibe reclamos desde múltiples medios de contacto, los unifica en una estructura común y los deja listos para que puedan ser procesados por los demás servicios del sistema.

## Canales considerados

- redes sociales
- mensajería
- formularios web
- correo electrónico

## Funciones esperadas

- recepción de reclamos desde distintos canales
- normalización de campos
- limpieza básica de información de entrada
- transformación de distintas estructuras a un formato común
- preparación de datos para clasificación y derivación
- integración con el servicio de IA cuando corresponda

## Objetivo dentro de la arquitectura

Este componente resuelve el problema de la diversidad de fuentes de entrada. Su rol es convertir distintos formatos de reclamo en una estructura uniforme para que el resto de la plataforma trabaje de forma centralizada.

## Base técnica

Desarrollado como microservicio independiente dentro de la arquitectura general, con apoyo de integración multicanal y procesamiento previo al negocio principal.

## Relación con otros microservicios

- envía reclamos normalizados a `ms-reclamos`
- puede apoyarse en `flask_servicio` para clasificación inicial
- trabaja como capa previa a la lógica de negocio principal

## Importancia dentro del proyecto

Es el punto de entrada del sistema y permite que la plataforma opere de forma omnicanal sin depender de un solo medio de comunicación.