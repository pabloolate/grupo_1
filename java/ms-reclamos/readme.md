# MS Reclamos

Microservicio encargado del ciclo de vida completo de los reclamos dentro de la plataforma.

## Responsabilidad principal

Gestionar el reclamo desde su ingreso hasta su cierre, incluyendo seguimiento, actualización de estado, derivación, resolución y consulta de historial.

## Funciones esperadas

- registrar reclamos
- almacenar reclamos normalizados
- consultar detalle de casos
- actualizar estados
- asignar responsables
- derivar reclamos
- cerrar casos resueltos
- mantener historial de seguimiento

## Objetivo dentro de la arquitectura

Este microservicio representa el núcleo funcional de la plataforma, ya que concentra la administración operativa del reclamo como entidad principal del sistema.

## Base técnica

Desarrollado como microservicio independiente dentro de la capa principal de negocio.

## Relación con otros microservicios

- recibe datos desde `ms-integracion-multicanal`
- puede consumir resultados desde `flask_servicio`
- se integra con `ms-usuarios-autenticacion` para control de acceso
- alimenta a `ms-reporteria` con información operativa

## Importancia dentro del proyecto

Es el servicio central del sistema, porque soporta la gestión completa del reclamo de punta a punta.