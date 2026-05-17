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

    if len(text) < 50:
        return {"error": "No se pudo extraer texto del archivo", "items": [], "hash": file_hash}

    items = _parse_items_groq(text)

    return {
        "hash":             file_hash,
        "texto_extraido":   text,
        "items":            items,
        "n_items":          len(items),
        "moneda_detectada": detect_currency(text),
        "pais_detectado":   detect_country(text),
    }
