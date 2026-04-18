# Sentimentalizador Flask

Servicio Flask mínimo para sentimentalizar comentarios usando un modelo guardado en la carpeta `results`.

## Requisitos

* **Python 3.11** recomendado
* PowerShell en Windows
* Carpeta `results` al lado de `sentimentalizador.py`

La estructura esperada es esta:

```text
flask_servicio/
├── sentimentalizador.py
├── README.md
└── results/
    ├── entrenamiento_1/
    ├── entrenamiento_2/
    └── ...
```

El script buscará automáticamente el último modelo dentro de `results`.

## Crear entorno virtual

En PowerShell, dentro de la carpeta del proyecto:

```powershell
python -m venv .venv
```

## Activar entorno virtual

```powershell
.venv\Scripts\Activate.ps1
```

Si PowerShell bloquea la activación, ejecuta primero:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Y luego nuevamente:

```powershell
.venv\Scripts\Activate.ps1
```

Cuando quede activo, debería verse algo como esto:

```powershell
(.venv) PS F:\Node_JS_Proyects\grupo_1\flask_servicio>
```

## Instalar dependencias

```powershell
python -m pip install --upgrade pip
pip install flask transformers torch sentencepiece
```

## Ejecutar el servicio

```powershell
python sentimentalizador.py
```

Por defecto debería levantar en:

```text
http://127.0.0.1:5000
```

## Probar health

```powershell
curl http://127.0.0.1:5000/health
```

## Probar predicción

```powershell
curl -X POST http://127.0.0.1:5000/predecir -H "Content-Type: application/json" -d '{"comentarios":["me encanta","que malo"]}'
```

## Notas

* Usa **Python 3.11** para evitar atados con `torch` y `transformers`.
* La carpeta `results` debe existir y contener al menos un entrenamiento/modelo válido.
