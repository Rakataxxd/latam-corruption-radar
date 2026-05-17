from __future__ import annotations
"""
Handler de mensajes de WhatsApp via Make.com.

Make.com envía POST /webhook/whatsapp con:
  { "from": "+502...", "body": "texto", "type": "text|image",
    "media_url": "https://...", "media_type": "image/jpeg" }

Retornamos: { "reply": "texto para enviar", "to": "+502..." }
"""
from typing import Optional
import decimal


# ── Constantes ────────────────────────────────────────────────────────────────

SEM_EMOJI = {
    "verde":          "🟢",
    "amarillo":       "🟡",
    "naranja":        "🟠",
    "rojo":           "🔴",
    "sin_referencia": "⚪",
    "sin_datos":      "⚫",
}

PAIS_FLAG = {"GT": "🇬🇹", "MX": "🇲🇽", "SV": "🇸🇻", "PE": "🇵🇪"}

HELP_MSG = """👋 *LatAm Corruption Radar*

Analizo contratos públicos de 🇬🇹 Guatemala, 🇸🇻 El Salvador, 🇲🇽 México y 🇵🇪 Perú.

📎 *Enviame una foto o PDF* de una cotización para analizarla ítem por ítem.

⌨️ *Comandos de texto:*
• `stats` — estadísticas globales de la base de datos
• `buscar <término>` — busca contratos por empresa o título
• `ayuda` — mostrar este mensaje

⚠️ _Análisis orientativo. No constituye prueba legal._"""


# ── Formateadores ─────────────────────────────────────────────────────────────

def _fmt(n: float, moneda: str = "") -> str:
    prefix = f"{moneda} " if moneda else ""
    if n >= 1_000_000: return f"{prefix}{n/1_000_000:.2f}M"
    if n >= 1_000:     return f"{prefix}{n:,.0f}"
    return f"{prefix}{n:.2f}"


def format_cotizacion_message(data: dict) -> str:
    score  = float(data.get("sobreprecio_score") or 0)
    pct    = float(data.get("sobreprecio_pct")   or 0)
    emoji  = SEM_EMOJI.get("rojo" if score >= 80 else "naranja" if score >= 50 else "amarillo" if score >= 20 else "verde", "⚫")
    items  = (data.get("resultado") or {}).get("items", [])
    alertas = (data.get("resultado") or {}).get("alertas", [])

    lines = [
        "🔍 *LatAm Corruption Radar — Análisis de cotización*",
        "",
        f"📊 *Score de riesgo: {score:.0f}/100* {emoji}",
        f"💹 Sobreprecio estimado: {pct:+.1f}%",
    ]

    if alertas:
        lines += ["", "⚠️ *Alertas:*"]
        for a in alertas[:3]:
            lines.append(f"  • {a}")

    rojos = [i for i in items if i.get("semaforo") == "rojo"][:3]
    if rojos:
        lines += ["", "🔴 *Ítems con mayor sobreprecio:*"]
        for i in rojos:
            sp = i.get("sobreprecio_pct") or 0
            desc = (i.get("descripcion") or "")[:40]
            lines.append(f"  • {desc}: {sp:+.0f}%")

    narrativa = (data.get("narrativa_ia") or "")[:500]
    if narrativa:
        lines += ["", f"🤖 {narrativa}"]

    cot_id = data.get("id", "")
    lines += [
        "",
        "─────────────────────────",
        "⚠️ _Este análisis es orientativo y no constituye prueba legal._",
    ]
    if cot_id:
        lines.append(f"🆔 `{cot_id}`")

    return "\n".join(lines)


def format_score_categoria_message(obra: dict, cat: dict) -> str:
    flag  = PAIS_FLAG.get(obra.get("pais", ""), "🌎")
    score = float(cat.get("score") or 0)
    emoji = SEM_EMOJI.get(cat.get("semaforo", "sin_datos"), "⚫")
    pct   = float(cat.get("sobreprecio_pct") or 0)
    perc  = float(cat.get("percentil") or 0)
    n     = int(cat.get("n_contratos") or 0)
    moneda = obra.get("moneda", "")

    lines = [
        f"{flag} *{(obra.get('titulo') or 'Contrato')[:60]}*",
        f"🏛 {obra.get('entidad_compradora') or 'N/D'}",
        f"💰 {_fmt(float(obra.get('monto_adjudicado') or 0), moneda)}",
        "",
        f"📊 *Score por categoría: {score:.0f}/100* {emoji}",
        f"📈 Percentil {perc:.0f}° entre {n} contratos similares",
        f"💹 {pct:+.1f}% vs mediana de su categoría",
        "",
        "📐 *Distribución de la categoría:*",
        f"  Mediana (P50): {_fmt(float(cat.get('mediana') or 0), moneda)}",
        f"  P75:           {_fmt(float(cat.get('p75') or 0), moneda)}",
        f"  P90:           {_fmt(float(cat.get('p90') or 0), moneda)}",
        f"  Este contrato: {_fmt(float(cat.get('monto') or 0), moneda)}",
    ]

    alertas = cat.get("alertas") or []
    if alertas:
        lines += ["", "⚠️ *Alertas:*"]
        for a in alertas[:3]:
            lines.append(f"  • {a}")

    narrativa = (cat.get("narrativa_ia") or "")[:400]
    if narrativa:
        lines += ["", f"🤖 {narrativa}"]

    ejemplos = (cat.get("ejemplos") or [])[:3]
    if ejemplos:
        lines += ["", "🔎 *Contratos más similares:*"]
        for e in ejemplos:
            diff = e.get("diferencia_pct", 0)
            sign = "+" if diff > 0 else ""
            lines.append(
                f"  • {(e.get('titulo') or '')[:35]}... "
                f"{_fmt(float(e.get('monto_adjudicado') or 0), moneda)} ({sign}{diff:.0f}%)"
            )

    lines += [
        "",
        "─────────────────────────",
        "⚠️ _Análisis orientativo. No constituye prueba legal._",
    ]
    return "\n".join(lines)


def format_stats_message(stats: dict) -> str:
    return (
        "📊 *Estadísticas LatAm Corruption Radar*\n\n"
        f"📁 Contratos públicos: {stats.get('total_obras', 0):,}\n"
        f"🏢 Empresas: {stats.get('total_empresas', 0):,}\n"
        f"🔍 Cotizaciones analizadas: {stats.get('total_cotizaciones', 0):,}\n"
        f"🌎 Países: {', '.join(stats.get('paises', []))}\n"
        f"📈 Sobreprecio promedio: {float(stats.get('avg_sobreprecio') or 0):+.1f}%\n"
        f"🔴 Contratos alto riesgo: {stats.get('obras_alto_riesgo', 0):,}"
    )


def format_busqueda_message(items: list, busqueda: str) -> str:
    if not items:
        return f"🔎 Sin resultados para *{busqueda}*.\n\nIntentá con otro término o enviá un PDF para analizar."

    lines = [f"🔎 *Resultados para \"{busqueda}\"*", ""]
    for obra in items[:5]:
        score = float(obra.get("sobreprecio_score") or 0)
        emoji = SEM_EMOJI.get(
            "rojo" if score >= 80 else "naranja" if score >= 50 else "amarillo" if score >= 20 else "verde", "⚫"
        )
        flag = PAIS_FLAG.get(obra.get("pais", ""), "🌎")
        monto = float(obra.get("monto_adjudicado") or 0)
        moneda = obra.get("moneda", "")
        lines.append(
            f"{emoji} {flag} *{(obra.get('titulo') or '')[:50]}*\n"
            f"   {_fmt(monto, moneda)} · ID: `{str(obra.get('id',''))[:8]}…`"
        )

    lines += ["", "💡 Enviame el ID completo para ver el análisis detallado."]
    return "\n".join(lines)


# ── Handler principal ─────────────────────────────────────────────────────────

async def handle_whatsapp_message(
    body: Optional[str],
    media_url: Optional[str],
    media_type: Optional[str],
    sender: str,
    db,
) -> str:
    """
    Procesa un mensaje entrante de WhatsApp.
    Retorna el texto de respuesta (ya formateado para WhatsApp).
    """

    # ── Imagen → analizar cotización ──────────────────────────────────────────
    if media_url and media_type and "image" in media_type:
        return await _handle_image(media_url, sender, db)

    # ── Texto ─────────────────────────────────────────────────────────────────
    text = (body or "").strip()
    low  = text.lower()

    if not low or low in ("hola", "hi", "hello", "ayuda", "help", "inicio", "start", "menu", "menú"):
        return HELP_MSG

    if low == "stats" or low == "estadísticas":
        import crud
        return format_stats_message(crud.get_global_stats(db))

    if low.startswith("buscar "):
        termino = text[7:].strip()
        import crud
        items, _ = crud.list_obras(db, busqueda=termino, page=1, page_size=5)
        return format_busqueda_message(items, termino)

    return HELP_MSG


async def _handle_image(media_url: str, sender: str, db) -> str:
    try:
        import httpx
        async with httpx.AsyncClient(timeout=40) as client:
            r = await client.get(media_url)
            r.raise_for_status()
            raw = r.content

        from parser import parse_cotizacion
        from pricing import analyze
        from narrator import generate_narrative
        import crud

        parsed = parse_cotizacion(raw)
        if "error" in parsed and not parsed.get("items"):
            return (
                f"❌ No pude leer la imagen correctamente.\n\n"
                f"_Error: {parsed['error']}_\n\n"
                "Por favor enviá un PDF o una imagen más clara y bien iluminada de la cotización."
            )

        pais   = parsed.get("pais_detectado") or "GT"
        result = analyze(db, parsed["items"], pais)
        narrativa = generate_narrative(result, pais)

        def _clean(obj):
            if isinstance(obj, decimal.Decimal): return float(obj)
            if isinstance(obj, dict):  return {k: _clean(v) for k, v in obj.items()}
            if isinstance(obj, list):  return [_clean(i) for i in obj]
            return obj

        existing = crud.get_cotizacion_by_hash(db, parsed["hash"])
        if existing:
            cot_id = existing.id
            sp_score = float(existing.sobreprecio_score or 0)
            sp_pct   = float(existing.sobreprecio_pct   or 0)
        else:
            cot = crud.create_cotizacion(
                db,
                hash_archivo      = parsed["hash"],
                texto_extraido    = parsed["texto_extraido"][:3000],
                items             = _clean(parsed["items"]),
                resultado         = _clean({
                    "score_general":   result.score_general,
                    "sobreprecio_pct": result.sobreprecio_pct,
                    "alertas":         result.alertas,
                    "items":           result.items,
                }),
                sobreprecio_score = result.score_general,
                sobreprecio_pct   = result.sobreprecio_pct,
                pais              = pais,
                moneda            = parsed.get("moneda_detectada", "USD"),
                narrativa_ia      = narrativa,
                es_publica        = False,
            )
            cot_id   = cot.id
            sp_score = float(cot.sobreprecio_score or 0)
            sp_pct   = float(cot.sobreprecio_pct   or 0)

        data = {
            "id":               cot_id,
            "sobreprecio_score": sp_score,
            "sobreprecio_pct":  sp_pct,
            "narrativa_ia":     narrativa,
            "resultado": _clean({
                "items":   result.items,
                "alertas": result.alertas,
            }),
        }
        return format_cotizacion_message(data)

    except Exception as e:
        return f"❌ Error procesando la imagen: {e}\n\nIntentar de nuevo o enviá un PDF."
