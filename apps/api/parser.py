from __future__ import annotations
import io
import json
import re
import hashlib
import os
from pathlib import Path

# Cargar .env si existe (cuando se importa fuera de uvicorn)
_env = Path(__file__).parent / ".env"
if _env.exists():
    for _line in _env.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip())

import pdfplumber
from groq import Groq

groq = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

_PARSE_SYSTEM = """Eres un extractor de datos de cotizaciones gubernamentales en LATAM.
Tu única función: devolver un JSON array con los ítems de la cotización.
Reglas:
- Devuelve SOLO JSON válido, sin markdown ni explicaciones.
- Si no hay cantidad, usa 1.
- Precios como números positivos, sin símbolos de moneda.
- Unidad normalizada: unidad, m2, m3, kg, litro, hora, mes, global.
- Si un item tiene subítems, desglósalos."""

_CURRENCY_PATTERNS = {
    "GTQ": [r"\bQ\.?\s*[\d,]", r"quetzal"],
    "MXN": [r"\$\s*[\d,].*MXN", r"pesos?\s+mexicanos"],
    "PEN": [r"\bS/\.\s*[\d,]", r"\bsoles?\b"],
    "USD": [r"\bUSD\b", r"dólares?", r"\$\s*[\d,]"],
}

# Tasas de conversión a USD (aproximadas 2024-2025)
_TO_USD_RATE = {"GTQ": 7.75, "MXN": 17.50, "PEN": 3.70, "USD": 1.0, "SVC": 1.0}


def _convert_items_to_usd(items: list[dict], moneda: str) -> list[dict]:
    """Convierte todos los precios de los ítems a USD."""
    rate = _TO_USD_RATE.get(moneda, 1.0)
    if rate == 1.0:
        return items
    converted = []
    for item in items:
        item = dict(item)
        for field in ("precio_unitario", "precio_total"):
            val = item.get(field)
            if val:
                item[field] = round(float(val) / rate, 2)
        converted.append(item)
    return converted

_COUNTRY_PATTERNS = {
    "GT": [r"guatecompras", r"guatemala", r"\bGTQ\b"],
    "SV": [r"comprasal", r"el salvador", r"\bSVC\b"],
    "MX": [r"compranet", r"m[eé]xico", r"\bRFC\b"],
    "PE": [r"seace", r"per[uú]", r"\bRUC\b"],
}


def _extract_text(data: bytes) -> str:
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        for row in table:
                            if row:
                                text += " | ".join(str(c or "").strip() for c in row) + "\n"
                else:
                    t = page.extract_text(x_tolerance=3, y_tolerance=3)
                    if t:
                        text += t + "\n"
    except Exception:
        pass
    return text.strip()


def _extract_items_vision(data: bytes) -> tuple[list[dict], str, str | None]:
    """Fallback para PDFs escaneados: convierte páginas a imagen y usa Groq Vision."""
    try:
        import fitz  # PyMuPDF
        import base64
    except ImportError:
        return [], "USD", None

    all_items: list[dict] = []
    moneda_detectada = "USD"
    pais_detectado: str | None = None

    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception:
        return [], moneda_detectada, pais_detectado

    for page_num in range(min(len(doc), 4)):  # máx 4 páginas
        page = doc[page_num]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        b64 = base64.b64encode(pix.tobytes("png")).decode()

        prompt_text = (
            "Eres un extractor de datos de cotizaciones gubernamentales.\n"
            "Analiza esta imagen y extrae TODOS los ítems con sus datos.\n\n"
            "Devuelve SOLO JSON válido con esta estructura:\n"
            '{"items":[{"descripcion":"...","cantidad":1.0,"unidad":"unidad","precio_unitario":0.0,"precio_total":0.0}],'
            '"moneda":"GTQ|USD|MXN|PEN","pais":"GT|SV|MX|PE"}\n\n'
            "Reglas:\n"
            "- Si no ves precio usa 0.\n"
            "- Si no hay ítems en esta página, items debe ser [].\n"
            "- moneda: detecta del documento (Q o GTQ = GTQ, S/ = PEN, $ = USD).\n"
            "- pais: detecta del documento (Guatemala=GT, El Salvador=SV, México=MX, Perú=PE).\n"
            "- SOLO JSON, sin markdown ni texto extra."
        )

        try:
            resp = groq.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                        {"type": "text", "text": prompt_text},
                    ],
                }],
                temperature=0.05,
                max_tokens=4096,
            )
            raw = resp.choices[0].message.content.strip()
            # Extraer JSON del response (puede venir con markdown)
            match = re.search(r"\{[\s\S]*\}", raw)
            if match:
                parsed = json.loads(match.group())
                page_items = parsed.get("items", [])
                all_items.extend([_sanitize(i) for i in page_items if isinstance(i, dict)])
                if not moneda_detectada or moneda_detectada == "USD":
                    moneda_detectada = parsed.get("moneda", "USD") or "USD"
                if not pais_detectado:
                    pais_detectado = parsed.get("pais")
        except Exception:
            pass

    return all_items, moneda_detectada, pais_detectado


def _parse_items_groq(text: str) -> list[dict]:
    prompt = f"""Extrae los ítems de esta cotización y devuelve SOLO un JSON array.

Formato:
[{{"descripcion":"...","cantidad":1.0,"unidad":"unidad","precio_unitario":0.0,"precio_total":0.0}}]

Texto:
{text[:8000]}"""

    try:
        resp = groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": _PARSE_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.05,
            max_tokens=4096,
        )
        raw = resp.choices[0].message.content.strip()
        match = re.search(r"\[[\s\S]*\]", raw)
        if not match:
            return []
        return [_sanitize(i) for i in json.loads(match.group()) if isinstance(i, dict)]
    except Exception:
        return []


def _sanitize(item: dict) -> dict:
    def to_f(v, d=0.0):
        try:
            return float(str(v).replace(",", ".").replace("$", "").strip() or d)
        except (ValueError, TypeError):
            return d

    qty = to_f(item.get("cantidad"), 1.0)
    pu  = to_f(item.get("precio_unitario"))
    pt  = to_f(item.get("precio_total"))

    if pu > 0 and pt == 0:
        pt = pu * qty
    if pt > 0 and pu == 0 and qty > 0:
        pu = pt / qty

    return {
        "descripcion":     str(item.get("descripcion", "")).strip()[:300],
        "cantidad":        qty,
        "unidad":          str(item.get("unidad", "unidad")).strip()[:30],
        "precio_unitario": pu,
        "precio_total":    pt,
    }


def detect_currency(text: str) -> str:
    for currency, patterns in _CURRENCY_PATTERNS.items():
        for p in patterns:
            if re.search(p, text, re.IGNORECASE):
                return currency
    return "USD"


def detect_country(text: str) -> str | None:
    for country, patterns in _COUNTRY_PATTERNS.items():
        for p in patterns:
            if re.search(p, text, re.IGNORECASE):
                return country
    return None


def parse_cotizacion(data: bytes) -> dict:
    file_hash = hashlib.sha256(data).hexdigest()
    text = _extract_text(data)

    # Verificar que el texto extraído tiene contenido real (no solo separadores vacíos)
    meaningful = re.sub(r'[\s|,.\-–]+', '', text)
    has_real_text = len(meaningful) >= 40

    # PDF con texto embebido → flujo normal
    if has_real_text:
        moneda = detect_currency(text)
        items  = _parse_items_groq(text)
        items  = _convert_items_to_usd(items, moneda)
        return {
            "hash":             file_hash,
            "texto_extraido":   text,
            "items":            items,
            "n_items":          len(items),
            "moneda_detectada": "USD",
            "moneda_original":  moneda,
            "pais_detectado":   detect_country(text),
        }

    # PDF escaneado (imagen) → usar Groq Vision como OCR
    items, moneda, pais = _extract_items_vision(data)

    if not items:
        return {"error": "No se pudo extraer texto ni ítems del archivo", "items": [], "hash": file_hash}

    items = _convert_items_to_usd(items, moneda or "USD")
    return {
        "hash":             file_hash,
        "texto_extraido":   "PDF escaneado — extracción por visión IA",
        "items":            items,
        "n_items":          len(items),
        "moneda_detectada": "USD",
        "moneda_original":  moneda or "USD",
        "pais_detectado":   pais,
    }
