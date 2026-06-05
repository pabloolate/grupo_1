
## `ms-usuarios-autenticacion/README.md`

```md
# ms-usuarios-autenticacion

Microservicio Spring Boot encargado de la autenticación de usuarios, emisión de tokens JWT, consulta de usuarios internos, roles, perfiles y resolución de asignaciones operativas.

Forma parte de la capa backend de una plataforma de centralización, análisis, jerarquización y derivación de reclamos no formales.

## Rol dentro del sistema

Este microservicio administra la identidad de los usuarios internos que operan la plataforma.

Permite:

- iniciar sesión,
- emitir JWT,
- consultar el usuario autenticado,
- listar usuarios,
- listar roles,
- listar perfiles,
- resolver usuarios disponibles para asignación,
- consultar usuarios disponibles por perfil.

## Puerto

Puerto por defecto:

```text
8081