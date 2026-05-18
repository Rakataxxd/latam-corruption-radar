# CotiRadar

**Detectamos sobreprecio en compras públicas de Latinoamérica.**

Plataforma de inteligencia pública que analiza contratos y cotizaciones gubernamentales con IA y datos abiertos para detectar posibles sobreprecios y dar transparencia al ciudadano.

> Hack@LATAM 2025 · 15K+ contratos · 5 países · IA integrada
> Demo web: `https://web-seven-zeta-97.vercel.app`

---

## Tabla de contenidos

- [Qué hace](#qué-hace)
- [Arquitectura](#arquitectura)
- [Estructura del repo](#estructura-del-repo)
- [Stack técnico](#stack-técnico)
- [Requisitos](#requisitos)
- [Setup local](#setup-local)
- [Variables de entorno](#variables-de-entorno)
- [Scripts y comandos útiles](#scripts-y-comandos-útiles)
- [Endpoints principales](#endpoints-principales)
- [Integración WhatsApp](#integración-whatsapp)
- [Fuentes de datos](#fuentes-de-datos)
- [Roadmap](#roadmap)

---

## Qué hace

- **Radar de Obras** — Lista contratos públicos ordenados por riesgo de sobreprecio, con semáforo (🟢/🟡/🟠/🔴) y filtros por país y categoría.
- **Análisis de Cotización con IA** — Subes un PDF o foto, el sistema extrae los ítems, los compara contra **15K+ contratos históricos** y devuelve:
  - Score de riesgo 0–100
  - % de sobreprecio vs mercado
  - Semáforo por ítem
  - Narrativa explicativa en español generada por LLM
- **Red de Contratos** — Grafo interactivo que conecta empresas y muestra cuáles operan en múltiples países.
- **Mapa de Riesgo** — Distribución geográfica del sobreprecio por país.
- **Bot WhatsApp** — Consultas rápidas (`stats`, `obras de Guatemala`, foto de cotización) vía WhatsApp.

---

## Arquitectura

```
                ┌─────────────────────┐
                │  Web (Next.js 14)   │
                │  apps/web           │
                └──────────┬──────────┘
                           │ REST
                           ▼
┌───────────┐    ┌─────────────────────┐    ┌──────────────────┐
│ Scrapers  │───▶│  API (FastAPI)      │───▶│ Postgres         │
│ scrapers/ │    │  apps/api           │    │ (Supabase)       │
└───────────┘    └──────────┬──────────┘    └──────────────────┘
                            │
                            │ Groq llama-3.3-70b
                            ▼
                ┌─────────────────────┐
                │  IA: narrativa,     │
                │  parsing, scoring   │
                └─────────────────────┘
                            ▲
                            │ webhook
                ┌───────────┴─────────┐
                │ WhatsApp ↔ Make.com │
                │ (o Twilio Sandbox)  │
                └─────────────────────┘
```

---

## Estructura del repo

```
latam-corruption-radar/
├── apps/
│   ├── api/                FastAPI + SQLAlchemy + Groq
│   │   ├── main.py         Endpoints REST
│   │   ├── parser.py       OCR / extracción de items desde PDF e imagen
│   │   ├── pricing.py      Comparación contra precios de referencia
│   │   ├── narrator.py     Narrativa generada por LLM
│   │   ├── whatsapp.py     Lógica del bot
│   │   ├── categoria_scoring.py
│   │   ├── crud.py / models.py / schemas.py / database.py / config.py
│   │   ├── seed_obras.py / seed_precios.py
│   │   ├── import_contratos_reales.py / import_precios_reales.py
│   │   └── requirements.txt
│   └── web/                Next.js 14 + Tailwind + ReactFlow + MapLibre
│       └── app/
│           ├── radar/      Listado de obras (Radar)
│           ├── grafo/      Red de contratos
│           ├── mapa/       Mapa de riesgo
│           ├── obra/       Detalle de obra
│           ├── empresa/    Detalle de empresa
│           ├── cotizar/    Subida y análisis de cotización
│           └── analisis/   Resultado de análisis
├── scrapers/               Scrapers por país (GT, SV, MX, PE)
│   ├── guatemala.py        Guatecompras
│   ├── elsalvador.py       COMPRASAL
│   ├── mexico.py           CompraNet
│   ├── peru.py             SEACE
│   ├── base.py / run_all.py
│   └── requirements.txt
├── scripts/                Utilidades: seeds, tests, generadores
├── docs/
│   └── make_setup.md       Guía para conectar WhatsApp vía Make.com
├── start.ps1               Arranque rápido en Windows (API + Web + ngrok)
└── .env.example
```

---

## Stack técnico

| Capa            | Tecnologías                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| Frontend        | Next.js 14, TypeScript, Tailwind CSS, ReactFlow, MapLibre GL, Recharts      |
| Backend         | FastAPI, Python 3.9+, SQLAlchemy, PostgreSQL (Supabase), Pydantic           |
| IA / ML         | Groq (llama-3.3-70b), parsing PDF (pdfplumber, PyMuPDF), OCR (pytesseract)  |
| Datos / Scrap.  | BeautifulSoup, httpx, lxml, rapidfuzz                                       |
| Integraciones   | WhatsApp Business Cloud (Make.com / Twilio), Guatecompras, COMPRASAL, CompraNet, SEACE, SECOP |
| Hosting         | Vercel (web), Render/Railway/Vercel (API), Supabase (DB)                    |

---

## Requisitos

- **Python** 3.9+
- **Node.js** 18+ y npm
- **PostgreSQL** (recomendado: Supabase, gratis)
- API key de **Groq** (`https://console.groq.com`)
- (Opcional) cuenta de **Make.com** o **Twilio** para WhatsApp

---

## Setup local

### 1) Clonar y configurar entorno

```bash
git clone <repo>
cd latam-corruption-radar
cp .env.example apps/api/.env
# editar apps/api/.env con tus credenciales (ver sección de variables)
```

### 2) Backend (FastAPI)

```bash
cd apps/api
python3 -m pip install -r requirements.txt
python3 start.py
# API en http://localhost:8000
# Docs en http://localhost:8000/docs
```

### 3) Frontend (Next.js)

```bash
cd apps/web
npm install
npm run dev
# Web en http://localhost:3000 (o el siguiente puerto libre)
```

### 4) (Opcional) Sembrar datos

```bash
cd apps/api
python3 seed_precios.py        # precios de referencia
python3 seed_obras.py          # obras demo
# o importar datos reales:
python3 import_contratos_reales.py
python3 import_precios_reales.py
```

### Atajo en Windows

```powershell
.\start.ps1            # API + Web
.\start.ps1 -ngrok     # + tunel público para webhooks
```

---

## Variables de entorno

Archivo `apps/api/.env` (basado en `.env.example`):

```env
# Supabase / Postgres
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROYECTO.supabase.co:5432/postgres

# Groq (https://console.groq.com)
GROQ_API_KEY=gsk_...

# Telegram (opcional)
TELEGRAM_TOKEN=...

# URLs
API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Para el frontend (en `apps/web/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Scripts y comandos útiles

```bash
# Correr scrapers
cd scrapers
python3 -m pip install -r requirements.txt
python3 run_all.py             # todos los países

# Reconstruir precios de referencia
cd apps/api
python3 build_reference_prices.py

# Probar la API rápido
curl http://localhost:8000/health
curl http://localhost:8000/stats
```

---

## Endpoints principales

| Método | Ruta                                  | Descripción                                            |
| ------ | ------------------------------------- | ------------------------------------------------------ |
| GET    | `/health`                             | Healthcheck                                            |
| GET    | `/stats`                              | Estadísticas globales                                  |
| GET    | `/obras`                              | Lista de obras públicas (filtros: pais, categoría, score, búsqueda) |
| GET    | `/obra/{obra_id}`                     | Detalle de obra (con items analizados)                 |
| GET    | `/obra/{obra_id}/contrato-ia`         | Estimación IA del contrato                             |
| GET    | `/obra/{obra_id}/score-categoria`     | Score percentílico vs contratos similares              |
| GET    | `/empresa/{empresa_id}`               | Detalle de empresa                                     |
| POST   | `/cotizacion/analizar`                | Sube PDF/imagen, devuelve análisis de sobreprecio      |
| GET    | `/cotizaciones/{id}`                  | Recupera análisis previo                               |
| POST   | `/webhook/whatsapp`                   | Webhook para mensajes de WhatsApp (texto e imágenes)   |
| POST   | `/admin/scrape`                       | Dispara scraping en background                         |
| POST   | `/admin/build-reference-prices`       | Reconstruye precios de referencia                      |
| GET    | `/admin/scrape/status`                | Estado de scraping                                     |

Documentación interactiva en: `http://localhost:8000/docs`.

---

## Integración WhatsApp

Hay dos caminos soportados; el flujo de negocio es el mismo.

**Camino A — Make.com + WhatsApp Cloud API (Meta)**  
Documentado paso a paso en [`docs/make_setup.md`](docs/make_setup.md).  
Resumen del flujo:

```
WhatsApp → Meta → Make.com → POST /webhook/whatsapp → CotiRadar API
         ← respuesta IA en WhatsApp ←
```

**Camino B — Twilio WhatsApp Sandbox**  
Recomendado para demos online rápidas. Apuntas el webhook del sandbox a tu URL pública (Render/Railway) `https://TU-API/webhook/whatsapp` y mapeas el payload de Twilio a los campos `from`, `body`, `type`, `media_url`, `media_type`.

Prueba rápida sin WhatsApp:

```bash
curl -X POST http://localhost:8000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"from":"+502123","body":"stats","type":"text"}'
```

---

## Fuentes de datos

| País          | Portal oficial | Scraper                  |
| ------------- | -------------- | ------------------------ |
| 🇬🇹 Guatemala | Guatecompras   | `scrapers/guatemala.py`  |
| 🇸🇻 El Salvador | COMPRASAL    | `scrapers/elsalvador.py` |
| 🇲🇽 México    | CompraNet      | `scrapers/mexico.py`     |
| 🇵🇪 Perú      | SEACE          | `scrapers/peru.py`       |
| 🇨🇴 Colombia  | SECOP          | (en datos importados)    |

---

## Roadmap

- Cobertura de más países (CO, AR, CL, EC)
- Detección automática de licitaciones de un solo oferente
- Asistente cívico conversacional (en evaluación con OpenClaw / agentes personales)
- Alertas proactivas a periodistas y auditores
- API pública con rate-limit para investigadores

---

## Licencia

Proyecto del Hack@LATAM 2025. Uso académico/cívico. Revisar con el equipo antes de uso comercial.
