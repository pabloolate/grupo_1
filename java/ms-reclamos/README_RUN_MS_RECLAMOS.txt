MS-RECLAMOS - Primer zip funcional

Puerto:
8082

BD:
gestion_centralizada_reclamos

Comando:
cd F:\Node_JS_Proyects\grupo_1\java\ms-reclamos
.\mvnw.cmd spring-boot:run

Probar:
GET http://localhost:8082/health
GET http://localhost:8082/reclamos
GET http://localhost:8082/reclamos/1
GET http://localhost:8082/reclamos/1/historial
GET http://localhost:8082/reclamos/1/comentarios
GET http://localhost:8082/reclamos/1/clasificacion-ia

Cambiar estado:
PATCH http://localhost:8082/reclamos/1/estado
{
  "estado": "EN_PROCESO",
  "usuarioId": 1,
  "observacion": "Cambio de prueba desde demo"
}

Asignar:
PATCH http://localhost:8082/reclamos/5/asignar
{
  "usuarioId": 2,
  "observacion": "Asignado para prueba"
}

Agregar comentario:
POST http://localhost:8082/reclamos/1/comentarios
{
  "usuarioId": 1,
  "comentario": "Comentario de prueba",
  "esInterno": true
}
