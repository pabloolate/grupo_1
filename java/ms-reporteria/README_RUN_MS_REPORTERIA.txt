MS REPORTERIA - PUERTO 8084

Ejecutar:
cd F:\Node_JS_Proyects\grupo_1\java\ms-reporteria
.\mvnw.cmd spring-boot:run

Endpoints:
GET http://localhost:8084/health
GET http://localhost:8084/reporteria/resumen
GET http://localhost:8084/reporteria/reclamos-por-estado
GET http://localhost:8084/reporteria/reclamos-por-canal
GET http://localhost:8084/reporteria/reclamos-por-prioridad
GET http://localhost:8084/reporteria/reclamos-por-categoria
GET http://localhost:8084/reporteria/dashboard

BD:
gestion_centralizada_reclamos

Este microservicio solo lee la BD y calcula metricas para dashboard/reporteria.
