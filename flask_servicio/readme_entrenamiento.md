
## `readme_entrenamiento.md`

```md
# Entrenamiento del modelo de sentimentalización

Este módulo permite entrenar un modelo de clasificación de sentimientos usando XLM-RoBERTa y un archivo `entrenamiento.json`.

El modelo entrenado es utilizado posteriormente por el servicio Flask para clasificar comentarios capturados desde Instagram y TikTok.

Dentro del sistema general, este entrenamiento permite alimentar la capa de análisis de sentimiento, encargada de detectar comentarios negativos que pueden representar reclamos no formales.

## Objetivo

Entrenar un modelo capaz de clasificar comentarios en categorías de sentimiento.

Etiquetas usadas:

- `negativo`
- `neutral`
- `positivo`
- `ironico`

La etiqueta `ironico` se conserva durante el entrenamiento, pero en el servicio Flask se normaliza como `Negativo` para efectos del flujo de reclamos, ya que puede representar molestias o quejas expresadas de forma indirecta.

## Requisitos

- Python 3.11 recomendado.
- Entorno virtual.
- Archivo `entrenamiento.json`.
- Carpeta `results`.
- PyTorch.
- Transformers.
- Datasets.
- SentencePiece.
- Accelerate.
- TensorFlow compat v1, usado por el script actual.

## Estructura esperada

```text
flask_servicio/
├── entrenar_modelo.py
├── evaluar_modelo.py
├── sentimentalizador.py
├── entrenamiento.json
├── readme_entrenamiento.md
└── results/