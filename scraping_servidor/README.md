# Sentimentalizador Simple

Sistema reducido desde el sentimentalizador grande:

- Instagram posts con Puppeteer.
- Instagram reels con Puppeteer.
- TikTok con Puppeteer para capturar links del perfil.
- TikTok con Playwright/CDP para entrar a cada video y sacar comentarios.
- Flask externo recibe `data_hijos` simple.
- Node filtra y guarda solo comentarios negativos.
- Post sin comentarios se descarta.
- Post con comentarios pero sin negativos no se guarda.
- Imágenes/capturas quedan en carpeta local `imagenes/`.
- Persistencia directa en MySQL/MariaDB.

## Instalación

```bash
npm install
cp .env.example .env
node --expose-gc index.js
```

## Endpoints

```bash
GET /health
POST /scrapeHTML
POST /generar
```

Ejemplo:

```json
{
  "url": "https://www.instagram.com/usuario/",
  "tipo": "instagram_post",
  "max_items": 10
}
```

Tipos válidos:

```txt
instagram_post
instagram_reel
tiktok
```
