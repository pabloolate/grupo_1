import os
import re
import csv
import json
import math
import time
import torch
import matplotlib.pyplot as plt

from transformers import XLMRobertaTokenizerFast, XLMRobertaForSequenceClassification
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay
)


RUTA_BASE = os.path.dirname(os.path.abspath(__file__))
RUTA_RESULTS = os.path.join(RUTA_BASE, "results")
RUTA_DATASET = os.path.join(RUTA_BASE, "entrenamiento.json")

# Déjalo en None para evaluar todo.
# Para prueba rápida, pon 1000.
LIMITE_REGISTROS = None

# RTX 3070 debería aguantar 32.
# Si da error de memoria CUDA, baja a 16 u 8.
BATCH_SIZE = 32

LABEL_MAP = {
    "negativo": 0,
    "neutral": 1,
    "positivo": 2,
    "ironico": 3
}

ID_TO_LABEL = {
    0: "negativo",
    1: "neutral",
    2: "positivo",
    3: "ironico"
}

LABELS_ORDENADOS = [0, 1, 2, 3]
NOMBRES_CLASES = ["negativo", "neutral", "positivo", "ironico"]


def log(mensaje, ruta_log=None):
    texto = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {mensaje}"
    print(texto, flush=True)

    if ruta_log:
        with open(ruta_log, "a", encoding="utf-8") as archivo:
            archivo.write(texto + "\n")


def obtener_ultimo_entrenamiento():
    if not os.path.exists(RUTA_RESULTS):
        raise FileNotFoundError(f"No existe la carpeta results: {RUTA_RESULTS}")

    carpetas = [
        nombre for nombre in os.listdir(RUTA_RESULTS)
        if re.match(r"entrenamiento_\d+$", nombre)
    ]

    if not carpetas:
        raise FileNotFoundError("No se encontraron carpetas entrenamiento_N dentro de results.")

    numeros = [int(re.search(r"\d+", carpeta).group()) for carpeta in carpetas]
    ultimo_numero = max(numeros)
    ruta_modelo = os.path.join(RUTA_RESULTS, f"entrenamiento_{ultimo_numero}")

    return ruta_modelo, ultimo_numero


def cargar_entrenamiento_json(ruta_log):
    log("📚 Cargando entrenamiento.json sin datasets...", ruta_log)

    if not os.path.exists(RUTA_DATASET):
        raise FileNotFoundError(f"No existe entrenamiento.json en: {RUTA_DATASET}")

    registros = []

    # Intenta JSON normal primero.
    try:
        with open(RUTA_DATASET, "r", encoding="utf-8") as archivo:
            contenido = json.load(archivo)

        if isinstance(contenido, list):
            registros = contenido
        elif isinstance(contenido, dict):
            if "train" in contenido and isinstance(contenido["train"], list):
                registros = contenido["train"]
            elif "data" in contenido and isinstance(contenido["data"], list):
                registros = contenido["data"]
            else:
                registros = [contenido]

    except json.JSONDecodeError:
        # Fallback JSONL.
        log("⚠️ No era JSON array/dict normal. Probando como JSONL...", ruta_log)

        with open(RUTA_DATASET, "r", encoding="utf-8") as archivo:
            for linea in archivo:
                linea = linea.strip()
                if not linea:
                    continue
                registros.append(json.loads(linea))

    textos = []
    etiquetas = []

    for registro in registros:
        comentario = registro.get("Comentario")
        sentimiento = registro.get("Sentimiento")

        if comentario is None:
            continue

        comentario = str(comentario).strip()

        if not comentario:
            continue

        if sentimiento not in LABEL_MAP:
            continue

        textos.append(comentario)
        etiquetas.append(LABEL_MAP[sentimiento])

    if LIMITE_REGISTROS is not None:
        textos = textos[:LIMITE_REGISTROS]
        etiquetas = etiquetas[:LIMITE_REGISTROS]

    log(f"🧾 Registros válidos para evaluar: {len(textos)}", ruta_log)

    if not textos:
        raise ValueError("No hay registros válidos para evaluar. Revisa Comentario/Sentimiento.")

    return textos, etiquetas


def resolver_device(ruta_log):
    log("🔍 Revisando CUDA...", ruta_log)
    log(f"torch version: {torch.__version__}", ruta_log)
    log(f"torch.cuda.is_available(): {torch.cuda.is_available()}", ruta_log)
    log(f"torch.version.cuda: {torch.version.cuda}", ruta_log)

    if torch.cuda.is_available():
        nombre_gpu = torch.cuda.get_device_name(0)
        log(f"🎮 GPU detectada: {nombre_gpu}", ruta_log)
        return torch.device("cuda")

    log("⚠️ CUDA no disponible. Se usará CPU.", ruta_log)
    return torch.device("cpu")


def cargar_modelo_y_tokenizer(ruta_modelo, device, ruta_log):
    log("🧠 Cargando tokenizer...", ruta_log)
    tokenizer = XLMRobertaTokenizerFast.from_pretrained(ruta_modelo)

    log("🧠 Cargando modelo entrenado...", ruta_log)
    modelo = XLMRobertaForSequenceClassification.from_pretrained(ruta_modelo)

    log(f"🚚 Moviendo modelo a {device}...", ruta_log)
    modelo.to(device)
    modelo.eval()

    log("✅ Modelo y tokenizer cargados.", ruta_log)

    return modelo, tokenizer


def predecir_lotes(modelo, tokenizer, textos, device, ruta_log):
    predicciones = []
    total = len(textos)
    total_lotes = math.ceil(total / BATCH_SIZE)

    log(f"🤖 Iniciando predicciones. Total lotes: {total_lotes}, batch_size={BATCH_SIZE}", ruta_log)

    if device.type == "cuda":
        torch.cuda.empty_cache()

    inicio_global = time.time()

    with torch.inference_mode():
        for numero_lote, inicio in enumerate(range(0, total, BATCH_SIZE), start=1):
            fin = min(inicio + BATCH_SIZE, total)
            lote_textos = textos[inicio:fin]

            entradas = tokenizer(
                lote_textos,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt"
            )

            entradas = {clave: valor.to(device) for clave, valor in entradas.items()}

            salidas = modelo(**entradas)
            logits = salidas.logits
            pred_lote = torch.argmax(logits, dim=1).detach().cpu().tolist()
            predicciones.extend(pred_lote)

            if numero_lote == 1 or numero_lote % 5 == 0 or numero_lote == total_lotes:
                porcentaje = (fin / total) * 100
                segundos = time.time() - inicio_global
                log(
                    f"🤖 Lote {numero_lote}/{total_lotes} | "
                    f"{fin}/{total} | {porcentaje:.2f}% | "
                    f"{segundos:.1f}s",
                    ruta_log
                )

            del entradas
            del salidas
            del logits

            if device.type == "cuda" and numero_lote % 50 == 0:
                torch.cuda.empty_cache()

    log("✅ Predicciones terminadas.", ruta_log)

    return predicciones


def construir_metricas(numero_entrenamiento, ruta_modelo, y_real, y_pred, device):
    accuracy = accuracy_score(y_real, y_pred)

    precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(
        y_real,
        y_pred,
        average="macro",
        zero_division=0
    )

    precision_weighted, recall_weighted, f1_weighted, _ = precision_recall_fscore_support(
        y_real,
        y_pred,
        average="weighted",
        zero_division=0
    )

    precision_por_clase, recall_por_clase, f1_por_clase, soporte_por_clase = precision_recall_fscore_support(
        y_real,
        y_pred,
        labels=LABELS_ORDENADOS,
        zero_division=0
    )

    matriz = confusion_matrix(
        y_real,
        y_pred,
        labels=LABELS_ORDENADOS
    )

    metricas = {
        "entrenamiento": f"entrenamiento_{numero_entrenamiento}",
        "ruta_modelo": ruta_modelo,
        "dataset": RUTA_DATASET,
        "total_registros_evaluados": len(y_real),
        "limite_registros": LIMITE_REGISTROS,
        "batch_size": BATCH_SIZE,
        "device": str(device),
        "cuda_disponible": bool(torch.cuda.is_available()),
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "accuracy": float(accuracy),
        "macro": {
            "precision": float(precision_macro),
            "recall": float(recall_macro),
            "f1": float(f1_macro)
        },
        "weighted": {
            "precision": float(precision_weighted),
            "recall": float(recall_weighted),
            "f1": float(f1_weighted)
        },
        "matriz_confusion": matriz.tolist(),
        "por_clase": {}
    }

    for posicion, indice_clase in enumerate(LABELS_ORDENADOS):
        nombre_clase = ID_TO_LABEL[indice_clase]
        metricas["por_clase"][nombre_clase] = {
            "precision": float(precision_por_clase[posicion]),
            "recall": float(recall_por_clase[posicion]),
            "f1": float(f1_por_clase[posicion]),
            "soporte": int(soporte_por_clase[posicion])
        }

    return metricas


def guardar_metricas_json(ruta_metricas, metricas):
    ruta_archivo = os.path.join(ruta_metricas, "metricas.json")

    with open(ruta_archivo, "w", encoding="utf-8") as archivo:
        json.dump(metricas, archivo, ensure_ascii=False, indent=2)

    return ruta_archivo


def guardar_reporte_clasificacion(ruta_metricas, y_real, y_pred):
    ruta_archivo = os.path.join(ruta_metricas, "reporte_clasificacion.txt")

    reporte = classification_report(
        y_real,
        y_pred,
        labels=LABELS_ORDENADOS,
        target_names=NOMBRES_CLASES,
        zero_division=0
    )

    with open(ruta_archivo, "w", encoding="utf-8") as archivo:
        archivo.write(reporte)

    return ruta_archivo


def guardar_matriz_confusion(ruta_metricas, y_real, y_pred):
    ruta_archivo = os.path.join(ruta_metricas, "matriz_confusion.png")

    matriz = confusion_matrix(y_real, y_pred, labels=LABELS_ORDENADOS)

    display = ConfusionMatrixDisplay(
        confusion_matrix=matriz,
        display_labels=NOMBRES_CLASES
    )

    fig, ax = plt.subplots(figsize=(9, 7))
    display.plot(ax=ax, values_format="d")
    plt.title("Matriz de confusión - Sentimentalización")
    plt.tight_layout()
    plt.savefig(ruta_archivo, dpi=150)
    plt.close(fig)

    return ruta_archivo


def guardar_predicciones_csv(ruta_metricas, textos, y_real, y_pred):
    ruta_archivo = os.path.join(ruta_metricas, "predicciones.csv")

    with open(ruta_archivo, "w", encoding="utf-8", newline="") as archivo:
        writer = csv.writer(archivo)
        writer.writerow(["texto", "etiqueta_real", "etiqueta_predicha"])

        for texto, real, predicha in zip(textos, y_real, y_pred):
            writer.writerow([
                str(texto).replace("\n", " ").replace("\r", " ").strip(),
                ID_TO_LABEL.get(int(real), "desconocido"),
                ID_TO_LABEL.get(int(predicha), "desconocido")
            ])

    return ruta_archivo


def imprimir_resumen(metricas, ruta_log):
    log("", ruta_log)
    log("📌 Resumen rápido:", ruta_log)
    log(f"Accuracy: {metricas['accuracy']:.4f}", ruta_log)
    log(f"Precision macro: {metricas['macro']['precision']:.4f}", ruta_log)
    log(f"Recall macro: {metricas['macro']['recall']:.4f}", ruta_log)
    log(f"F1 macro: {metricas['macro']['f1']:.4f}", ruta_log)

    negativo = metricas["por_clase"]["negativo"]

    log("", ruta_log)
    log("📌 Clase negativa:", ruta_log)
    log(f"Precision negativo: {negativo['precision']:.4f}", ruta_log)
    log(f"Recall negativo: {negativo['recall']:.4f}", ruta_log)
    log(f"F1 negativo: {negativo['f1']:.4f}", ruta_log)
    log(f"Soporte negativo: {negativo['soporte']}", ruta_log)


def evaluar_modelo():
    print("🚀 ARRANCANDO evaluar_modelo.py", flush=True)

    ruta_modelo, numero_entrenamiento = obtener_ultimo_entrenamiento()
    ruta_metricas = os.path.join(ruta_modelo, "metricas")
    os.makedirs(ruta_metricas, exist_ok=True)

    ruta_log = os.path.join(ruta_metricas, "progreso_evaluacion.log")

    with open(ruta_log, "w", encoding="utf-8") as archivo:
        archivo.write("Inicio evaluación\n")

    log("🔎 Buscando último entrenamiento...", ruta_log)
    log(f"📦 Modelo encontrado: entrenamiento_{numero_entrenamiento}", ruta_log)
    log(f"📁 Ruta modelo: {ruta_modelo}", ruta_log)

    device = resolver_device(ruta_log)

    textos, y_real = cargar_entrenamiento_json(ruta_log)

    modelo, tokenizer = cargar_modelo_y_tokenizer(ruta_modelo, device, ruta_log)

    y_pred = predecir_lotes(
        modelo=modelo,
        tokenizer=tokenizer,
        textos=textos,
        device=device,
        ruta_log=ruta_log
    )

    log("📊 Calculando métricas...", ruta_log)
    metricas = construir_metricas(
        numero_entrenamiento=numero_entrenamiento,
        ruta_modelo=ruta_modelo,
        y_real=y_real,
        y_pred=y_pred,
        device=device
    )

    log("💾 Guardando archivos finales...", ruta_log)
    ruta_json = guardar_metricas_json(ruta_metricas, metricas)
    ruta_reporte = guardar_reporte_clasificacion(ruta_metricas, y_real, y_pred)
    ruta_matriz = guardar_matriz_confusion(ruta_metricas, y_real, y_pred)
    ruta_csv = guardar_predicciones_csv(ruta_metricas, textos, y_real, y_pred)

    log("", ruta_log)
    log("✅ Evaluación completada.", ruta_log)
    log(f"📄 Métricas JSON: {ruta_json}", ruta_log)
    log(f"📄 Reporte clasificación: {ruta_reporte}", ruta_log)
    log(f"🖼️ Matriz confusión: {ruta_matriz}", ruta_log)
    log(f"📄 Predicciones CSV: {ruta_csv}", ruta_log)

    imprimir_resumen(metricas, ruta_log)


if __name__ == "__main__":
    try:
        evaluar_modelo()
    except RuntimeError as error:
        print("\n❌ RuntimeError:", flush=True)
        print(str(error), flush=True)

        if "CUDA out of memory" in str(error):
            print("\nBaja BATCH_SIZE a 16 u 8 y vuelve a ejecutar.", flush=True)

        raise
    except Exception as error:
        print("\n❌ Error ejecutando evaluar_modelo.py:", flush=True)
        print(str(error), flush=True)
        raise