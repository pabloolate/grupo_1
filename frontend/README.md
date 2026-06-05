# Frontend - Gestión Centralizada de Reclamos

## Instalación

```powershell
cd F:\Node_JS_Proyects\grupo_1\frontend
npm install
npm run dev
```

## Servicios esperados

- Auth: http://localhost:8081
- Reclamos: http://localhost:8082
- Integración multicanal: http://localhost:8083
- Reportería: http://localhost:8084

## Usuarios demo

Clave para todos: `Fullstack2026@`

- olate.pablo@gmail.com
- sebaore13@gmail.com
- trabajador@demo.cl
- postventa@demo.cl
- visor@demo.cl

# Frontend - Gestión Centralizada de Reclamos

Frontend desarrollado en React + Vite para visualizar, operar y supervisar reclamos no formales provenientes de canales digitales.

Este módulo forma parte de una plataforma general de centralización, análisis, jerarquización y derivación de reclamos. Su función es entregar una interfaz operativa para revisar usuarios reclamantes, casos derivados, reclamos agrupados, estados, prioridades, métricas, reportería y trazabilidad.

El sistema no resuelve reclamos directamente. La interfaz permite ordenar, visualizar, priorizar y derivar información hacia las áreas o plataformas reales de atención de la organización.

## Rol dentro del sistema general

El frontend es la capa visual del sistema.

Flujo general:

```text
Instagram / TikTok
        ↓
scraping_servidor
        ↓
flask_servicio
        ↓
comentarios_negativos
        ↓
derivador_reclamos
        ↓
microservicios Java
        ↓
frontend
        ↓
gestión operativa / plataformas reales de atención
