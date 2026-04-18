# MS Usuarios y autenticación

Microservicio encargado de la gestión de acceso, perfiles y control de usuarios internos de la plataforma.

## Responsabilidad principal

Administrar la autenticación y autorización de los usuarios que operan el sistema, resguardando que cada perfil tenga acceso únicamente a las funciones que le corresponden.

## Funciones esperadas

- inicio de sesión
- validación de credenciales
- gestión de usuarios internos
- administración de perfiles y roles
- control de permisos
- protección de acceso a módulos del sistema

## Objetivo dentro de la arquitectura

Separar la seguridad y gestión de usuarios del resto de la lógica de negocio permite mantener una arquitectura más ordenada, mantenible y segura.

## Base técnica

Desarrollado como microservicio independiente dentro de la capa principal de negocio.

## Relación con otros microservicios

- controla acceso a `ms-reclamos`
- controla acceso a `ms-reporteria`
- define permisos de operación para usuarios internos

## Importancia dentro del proyecto

Es el servicio que establece la base de acceso seguro al sistema y organiza la operación según roles y responsabilidades.