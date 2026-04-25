sfrom flask import Flask, request, jsonify
from transformers import XLMRobertaForSequenceClassification, XLMRobertaTokenizer
import os
import re
import torch

app = Flask(__name__)

HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', '5000'))
RESULTS_DIR = os.getenv('RESULTS_DIR', './results')

DISPOSITIVO = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
MODELO = None
TOKENIZER = None
MODELO_PATH = None
NOMBRE_ENTRENAMIENTO = None


def obtener_ultimo_modelo_guardado(base_path: str = RESULTS_DIR):
    if not os.path.isdir(base_path):
        raise ValueError(f"No existe la carpeta de modelos: {base_path}")

    modelos = []
    for carpeta in os.listdir(base_path):
        ruta = os.path.join(base_path, carpeta)
        if os.path.isdir(ruta) and re.match(r"entrenamiento_\d+", carpeta):
            modelos.append((ruta, carpeta))

    if not modelos:
        raise ValueError(f"No se encontró ningún modelo entrenado en {base_path}")

    modelos.sort(key=lambda x: int(re.search(r"\d+", x[1]).group()), reverse=True)
    return modelos[0]



def cargar_modelo():
    global MODELO, TOKENIZER, MODELO_PATH, NOMBRE_ENTRENAMIENTO

    MODELO_PATH, NOMBRE_ENTRENAMIENTO = obtener_ultimo_modelo_guardado(RESULTS_DIR)
    MODELO = XLMRobertaForSequenceClassification.from_pretrained(MODELO_PATH).to(DISPOSITIVO)
    MODELO.eval()
    TOKENIZER = XLMRobertaTokenizer.from_pretrained('xlm-roberta-base')



def asegurar_modelo_cargado():
    global MODELO, TOKENIZER
    if MODELO is None or TOKENIZER is None:
        cargar_modelo()



def normalizar_sentimiento_modelo(indice_prediccion: int) -> str:
    sentimientos = ['Negativo', 'Neutral', 'Positivo', 'Ironico']
    resultado = sentimientos[indice_prediccion]
    if resultado == 'Ironico':
        return 'Negativo'
    return resultado



def predecir_sentimientos_batch(textos):
    if not isinstance(textos, list):
        raise ValueError("'comentarios' debe ser una lista")

    textos_validos = [str(texto or '').strip() for texto in textos]
    if not textos_validos:
        return []

    asegurar_modelo_cargado()

    inputs = TOKENIZER(
        textos_validos,
        return_tensors='pt',
        truncation=True,
        padding=True,
        max_length=512,
    )

    inputs = {k: v.to(DISPOSITIVO) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = MODELO(**inputs)
        logits = outputs.logits
        preds = torch.argmax(logits, dim=1).detach().cpu().tolist()

    return [normalizar_sentimiento_modelo(int(pred)) for pred in preds]



def construir_resultados(comentarios, sentimientos):
    resultados = []
    for comentario, sentimiento in zip(comentarios, sentimientos):
        resultados.append({
            'comentario': comentario,
            'sentimiento': sentimiento,
        })
    return resultados


@app.route('/predecir', methods=['POST'])
def predecir():
    try:
        data = request.get_json(silent=True)
        if not data or 'comentarios' not in data:
            return jsonify({'error': "Debes enviar 'comentarios'"}), 400

        comentarios = data['comentarios']
        if not isinstance(comentarios, list) or len(comentarios) == 0:
            return jsonify({'error': "'comentarios' debe ser un arreglo no vacío"}), 400

        comentarios = [str(c or '') for c in comentarios]
        sentimientos = predecir_sentimientos_batch(comentarios)
        resultados = construir_resultados(comentarios, sentimientos)

        return jsonify({
            'modelo': NOMBRE_ENTRENAMIENTO,
            'dispositivo': str(DISPOSITIVO),
            'resultados': resultados,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'ok': True,
        'modelo_cargado': MODELO is not None and TOKENIZER is not None,
        'modelo_path': MODELO_PATH,
        'modelo': NOMBRE_ENTRENAMIENTO,
        'dispositivo': str(DISPOSITIVO),
        'results_dir': RESULTS_DIR,
    })


if __name__ == '__main__':
    app.run(host=HOST, port=PORT)
