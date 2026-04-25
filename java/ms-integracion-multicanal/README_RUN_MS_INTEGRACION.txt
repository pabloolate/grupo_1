MS INTEGRACION MULTICANAL

Puerto:
8083

Ejecutar:
cd F:\Node_JS_Proyects\grupo_1\java\ms-integracion-multicanal
.\mvnw.cmd spring-boot:run

Endpoints:
GET  http://localhost:8083/health
GET  http://localhost:8083/integracion/canales
GET  http://localhost:8083/integracion/entrantes
GET  http://localhost:8083/integracion/entrantes/1
POST http://localhost:8083/integracion/formulario
POST http://localhost:8083/integracion/correo
POST http://localhost:8083/integracion/red-social
POST http://localhost:8083/integracion/manual

Body ejemplo:
{
  "nombreCliente": "Cliente Demo",
  "correoCliente": "cliente.demo@example.com",
  "asunto": "Reclamo desde formulario",
  "mensaje": "Mi pedido no ha llegado y necesito una respuesta.",
  "identificadorExterno": "front-demo-001"
}

Para red social puedes agregar:
{
  "nombreCliente": "Cliente Instagram",
  "correoCliente": "cliente.instagram@example.com",
  "asunto": "Reclamo por Instagram",
  "mensaje": "Escribi por redes sociales y no he recibido respuesta.",
  "canalOrigen": "INSTAGRAM",
  "identificadorExterno": "ig-demo-001"
}

Este microservicio crea:
1) registro en reclamos_entrantes
2) registro formal en reclamos

Luego puedes verlo desde ms-reclamos:
GET http://localhost:8082/reclamos
