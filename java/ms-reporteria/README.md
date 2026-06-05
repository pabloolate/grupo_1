
## `ms-reporteria/README.md`

```md
# ms-reporteria

Microservicio Spring Boot encargado de exponer indicadores, conteos y resúmenes para reportería y dashboard operativo.

Forma parte de una plataforma de centralización, análisis, jerarquización y derivación de reclamos no formales.

## Rol dentro del sistema

Este microservicio consulta información ya registrada en las bases del sistema y la expone como métricas para frontend o consumo interno.

No crea reclamos ni modifica casos. Su función es entregar datos agregados para supervisión operativa.

## Puerto

Puerto por defecto:

```text
8084