from datasets import load_dataset
from transformers import XLMRobertaTokenizerFast, XLMRobertaForSequenceClassification, TrainingArguments, Trainer
import torch
import os
import re
import tensorflow.compat.v1 as tf
import torch.nn as nn
import torch.nn.functional as F

tf.disable_v2_behavior()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Usando: {device}")

dataset = load_dataset('json', data_files=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'entrenamiento.json'))
print(f"Estructura del dataset: {dataset}")

# Etiquetas incluyendo ironía
label_map = {'negativo': 0, 'neutral': 1, 'positivo': 2, 'ironico': 3}

def filtrar_etiquetas_invalidas(example):
    return example['Sentimiento'] in label_map

def mapear_etiquetas(example):
    example['label'] = label_map[example['Sentimiento']]
    return example

dataset['train'] = dataset['train'].filter(filtrar_etiquetas_invalidas)
dataset['train'] = dataset['train'].map(mapear_etiquetas)

dataset['train'] = dataset['train'].map(lambda e: {**e, "longitud": len(e["Comentario"].split())})
dataset['train'] = dataset['train'].sort("longitud")
dataset['train'] = dataset['train'].remove_columns("longitud")

tokenizer = XLMRobertaTokenizerFast.from_pretrained('xlm-roberta-base')

def tokenize_function(example):
    return tokenizer(example['Comentario'], padding="max_length", truncation=True)

dataset['train'] = dataset['train'].map(tokenize_function)

split_dataset = dataset['train'].train_test_split(test_size=0.2)
train_dataset = split_dataset['train']
val_dataset = split_dataset['test']

def obtener_ultimo_entrenamiento(path='./results'):
    carpetas = [d for d in os.listdir(path) if re.match(r'entrenamiento_\d+', d)]
    if not carpetas:
        return 0
    numeros = [int(re.search(r'\d+', c).group()) for c in carpetas if re.search(r'\d+', c)]
    return max(numeros)

ultimo_entrenamiento = obtener_ultimo_entrenamiento()
entrenamiento_actual = ultimo_entrenamiento + 1
output_dir = f'./results/entrenamiento_{entrenamiento_actual}'
print(f"📦 Último entrenamiento encontrado: {ultimo_entrenamiento}")
print(f"\n🔁 Entrenando modelo entrenamiento_{entrenamiento_actual} durante 1 época...")

model = XLMRobertaForSequenceClassification.from_pretrained(
    f'./results/entrenamiento_{ultimo_entrenamiento}' if ultimo_entrenamiento > 0 else 'xlm-roberta-base',
    num_labels=len(label_map)
)
model.to(device)

class FocalLoss(nn.Module):
    def __init__(self, alpha=1, gamma=2, reduction='mean'):
        super(FocalLoss, self).__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, logits, targets):
        ce_loss = F.cross_entropy(logits, targets, reduction='none')
        pt = torch.exp(-ce_loss)
        focal_loss = self.alpha * (1 - pt) ** self.gamma * ce_loss
        return focal_loss.mean() if self.reduction == 'mean' else focal_loss.sum()

class CustomTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits = outputs.get("logits")
        loss_fct = FocalLoss()
        loss = loss_fct(logits, labels)
        return (loss, outputs) if return_outputs else loss

training_args = TrainingArguments(
    output_dir=output_dir,
    evaluation_strategy="steps",
    eval_steps=500,
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=3,
    weight_decay=0.01,
    save_steps=1000,
    save_total_limit=5,
    logging_dir='./logs',
    logging_steps=100,
    gradient_accumulation_steps=4,
    lr_scheduler_type="linear",
    fp16=True,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False
)

trainer = CustomTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset
)

trainer.train()

model.save_pretrained(output_dir)
tokenizer.save_pretrained(output_dir)

print("\n✅ Entrenamiento completado.")
