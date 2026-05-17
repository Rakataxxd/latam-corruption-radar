import os
from pathlib import Path

_env = Path(__file__).parent / ".env"
if _env.exists():
    for _line in _env.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip())

from groq import Groq

groq = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

SYSTEM_PROMPT = """Eres el analista de LatAm Corruption Radar.
Tu función: redactar en español claro y accesible para cualquier ciudadano
el resultado del análisis de una cotización gubernamental.

Principios obligatorios:
1. NUNCA acuses directamente. Usa frases como "los datos sugieren", "según los precios de referencia".
2. Sé específico con números: menciona porcentajes exactos.
3. Explica el semáforo (verde/amarillo/naranja/rojo) en términos simples.
4. Incluye siempre al final: "⚠️ Este análisis es orientativo y no constituye prueba legal. Los precios de referencia son medianas históricas de contratos similares."
5. Máximo 280 palabras. Párrafos cortos. Sin bullets."""


def generate_narrative(result, pais: str) -> str:
    NOMBRES = {"MX": "México", "GT": "Guatemala", "SV": "El Salvador", "PE": "Perú"}
    pais_nombre = NOMBRES.get(pais, pais)

    items_alerta = [
        i for i in result.items
        if i.get("semaforo") in ("rojo", "naranja")
    ][:4]

    resumen = ""
    for i in items_alerta:
        resumen += (
            f"- {i['descripcion'][:55]}: cotizado {i['precio_unitario']:.2f}, "
            f"referencia {i.get('precio_referencia', 0):.2f} "
            f"({i.get('sobreprecio_pct', 0):+.1f}%)\n"
        )

    user_msg = f"""Analiza esta cotización de {pais_nombre}:

Score general: {result.score_general:.1f}/100
Sobreprecio total vs mercado: {result.sobreprecio_pct:+.1f}%
Total cotizado: {result.total_cotizado:,.2f}
Total referencia: {result.total_referencia:,.2f}
Ítems analizados: {result.items_con_ref}/{result.items_total} ({result.cobertura_pct:.0f}% cobertura)
Alertas: {'; '.join(result.alertas) if result.alertas else 'ninguna'}

Ítems con mayor desviación:
{resumen or 'Sin referencias disponibles.'}"""

    try:
        resp = groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_msg},
            ],
            temperature=0.6,
            max_tokens=512,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"Análisis no disponible: {e}"
