MS USUARIOS AUTENTICACION - EJECUCION LOCAL

Requisitos:
- PostgreSQL local corriendo
- BD creada: gestion_centralizada_reclamos
- Tablas y seed ya cargados
- Java 21

Puerto del microservicio:
- 8081

Comando Windows PowerShell:
cd F:\Node_JS_Projects\grupo_1\java\ms-usuarios-autenticacion
.\mvnw.cmd spring-boot:run

Health:
GET http://localhost:8081/health

Login demo:
POST http://localhost:8081/auth/login
Content-Type: application/json

{
  "correo": "olate.pablo@gmail.com",
  "password": "Fullstack2026@"
}

Usuarios disponibles:
- olate.pablo@gmail.com / Fullstack2026@ / ADMINISTRADOR / GERENCIA
- sebaore13@gmail.com / Fullstack2026@ / ADMINISTRADOR / GERENCIA
- trabajador@demo.cl / Fullstack2026@ / TRABAJADOR / ATENCION_CLIENTE
- postventa@demo.cl / Fullstack2026@ / TRABAJADOR / POSTVENTA
- visor@demo.cl / Fullstack2026@ / VISOR / OPERACIONES

Endpoints iniciales:
GET  /health
POST /auth/login
GET  /auth/me              requiere Bearer token
GET  /usuarios             requiere ADMINISTRADOR
GET  /usuarios/{id}        requiere ADMINISTRADOR
GET  /roles                requiere token
GET  /perfiles             requiere token
