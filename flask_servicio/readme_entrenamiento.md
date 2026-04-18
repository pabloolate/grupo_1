# Entrenamiento del modelo de sentimentalización

Este script entrena un modelo de clasificación de sentimientos usando XLM-RoBERTa y un archivo `entrenamiento.json` ubicado en la raíz del proyecto.

## Requisitos

- Python 3.11 recomendado
- Entorno virtual (`venv`)
- Archivo `entrenamiento.json` en la misma carpeta que el script de entrenamiento

## Estructura esperada

proyecto/
├── entrenamiento.py
├── entrenamiento.json
├── readme_entrenamiento.md
└── results/

## Crear entorno virtual

En PowerShell:

python -m venv .venv

## Activar entorno virtual

.venv\Scripts\Activate.ps1

Si PowerShell lo bloquea:

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1

## Instalar dependencias

python -m pip install --upgrade pip
pip install datasets transformers torch tensorflow sentencepiece accelerate

## Archivo de entrenamiento

El script busca este archivo automáticamente en la raíz del proyecto:

entrenamiento.json

La línea quedó así:

dataset = load_dataset('json', data_files=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'entrenamiento.json'))

## Formato esperado del JSON

Cada registro debe tener al menos estos campos:

- `Comentario`
- `Sentimiento`

Ejemplo:

[
  {
    "Comentario": "me encantó el producto",
    "Sentimiento": "positivo"
  },
  {
    "Comentario": "no me gustó para nada",
    "Sentimiento": "negativo"
  }
]

## Etiquetas válidas

El script usa estas etiquetas:

- `negativo`
- `neutral`
- `positivo`
- `ironico`

Cualquier etiqueta fuera de esas se filtra automáticamente.

## Ejecutar entrenamiento

python entrenamiento.py

## Cómo guarda los modelos

El script revisa la carpeta `results` y crea una nueva carpeta incremental:

results/entrenamiento_1
results/entrenamiento_2
results/entrenamiento_3
...

Si ya existe un entrenamiento anterior, lo toma como base y sigue entrenando desde ahí.

## Qué hace el script

- Carga `entrenamiento.json`
- Filtra etiquetas inválidas
- Convierte etiquetas a números
- Tokeniza con `xlm-roberta-base`
- Divide en train/test
- Entrena con `Trainer`
- Usa `FocalLoss`
- Guarda modelo y tokenizer en `results/entrenamiento_X`

## Notas importantes

- Si no tienes GPU, entrenará en CPU, pero más lento.
- Si `fp16=True` da problemas en tu equipo, cámbialo a `False`.
- La carpeta `results` debe existir antes de entrenar, o debes crearla manualmente.
- El script usa el último entrenamiento detectado para continuar desde ahí.

## Ejecución típica completa

python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install datasets transformers torch tensorflow sentencepiece accelerate
python entrenamiento.py