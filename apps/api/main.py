from __future__ import annotations
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, Form, Request, UploadFile, HTTPException, BackgroundTasks, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db, engine
from models import Base
from parser import parse_cotizacion
from pricing import analyze
from narrator import generate_narrative
from schemas import CotizacionResponse, ObraListResponse, EmpresaDetail, ScrapeRequest, StatsResponse
import crud


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="CotiRadar API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/cotizacion/analizar")
async def analizar_cotizacion(
    background_tasks: BackgroundTasks,
    archivo: UploadFile = File(...),
    pais: Optional[str] = Form(None),
    nombre: Optional[str] = Form(None),
    publica: bool = Form(False),
    db: Session = Depends(get_db),
):
    if archivo.content_type not in ("application/pdf", "image/jpeg", "image/png", "application/octet-stream"):
        raise HTTPException(400, "Solo se aceptan PDF, JPEG o PNG")

    raw = await archivo.read()
    if len(raw) > 15 * 1024 * 1024:
        raise HTTPException(413, "Archivo demasiado grande (máx 15 MB)")

    parsed = parse_cotizacion(raw)
    if "error" in parsed and not parsed.get("items"):
        raise HTTPException(422, parsed["error"])

    existing = crud.get_cotizacion_by_hash(db, parsed["hash"])
    if existing:
        return existing

    pais_final = (pais or parsed.get("pais_detectado") or "GT").upper()
    result = analyze(db, parsed["items"], pais_final)
    narrativa = generate_narrative(result, pais_final)

    import decimal, json as _json

    def _clean(obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, dict):
            return {k: _clean(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_clean(i) for i in obj]
        return obj

    resultado_clean = _clean({
        "score_general":    result.score_general,
        "sobreprecio_pct":  result.sobreprecio_pct,
        "total_cotizado":   result.total_cotizado,
        "total_referencia": result.total_referencia,
        "items_con_ref":    result.items_con_ref,
        "items_total":      result.items_total,
        "cobertura_pct":    result.cobertura_pct,
        "alertas":          result.alertas,
        "items":            result.items,
    })

    cot = crud.create_cotizacion(
        db,
        hash_archivo      = parsed["hash"],
        texto_extraido    = parsed["texto_extraido"][:5000],
        items             = _clean(parsed["items"]),
        resultado         = resultado_clean,
        sobreprecio_score = result.score_general,
        sobreprecio_pct   = result.sobreprecio_pct,
        pais              = pais_final,
        moneda            = parsed.get("moneda_detectada", "USD"),
        narrativa_ia      = narrativa,
        es_publica        = publica,
        nombre_usuario    = nombre,
    )
    return {
        "id":               cot.id,
        "sobreprecio_score": float(cot.sobreprecio_score) if cot.sobreprecio_score else 0,
        "sobreprecio_pct":  float(cot.sobreprecio_pct) if cot.sobreprecio_pct else 0,
        "pais":             cot.pais,
        "moneda":           cot.moneda,
        "narrativa_ia":     cot.narrativa_ia,
        "items":            cot.items,
        "resultado":        cot.resultado,
        "created_at":       str(cot.created_at),
    }


_obras_cache: dict = {}
_obras_cache.clear()  # limpiar al reiniciar

@app.get("/obras")
def listar_obras(
    pais:      Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    min_score: float         = Query(0),
    page:      int           = Query(1, ge=1),
    page_size: int           = Query(20, ge=1, le=100),
    order_by:  str           = Query("sobreprecio_score"),
    busqueda:  Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    cache_key = f"{pais}:{min_score}:{page}:{page_size}:{order_by}:{busqueda}"
    if cache_key in _obras_cache:
        return _obras_cache[cache_key]

    items, total = crud.list_obras(
        db, pais=pais, categoria=categoria,
        min_score=min_score, page=page,
        page_size=page_size, order_by=order_by,
        busqueda=busqueda,
    )
    result = {"items": items, "total": total, "page": page, "page_size": page_size}

    if len(_obras_cache) > 200:
        _obras_cache.clear()
    _obras_cache[cache_key] = result
    return result


@app.get("/empresa/{empresa_id}")
def detalle_empresa(empresa_id: str, db: Session = Depends(get_db)):
    try:
        import uuid; uuid.UUID(empresa_id)
    except ValueError:
        raise HTTPException(404, "Empresa no encontrada")
    empresa = crud.get_empresa_detail(db, empresa_id)
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada")
    return empresa


@app.get("/stats")
def stats(db: Session = Depends(get_db)):
    return crud.get_global_stats(db)


@app.post("/admin/scrape")
async def trigger_scrape(req: ScrapeRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    from scrapers.run_all import run_scraper
    from build_reference_prices import build_reference_prices

    async def scrape_and_build(pais, max_records, db):
        await run_scraper(pais, max_records, db)
        build_reference_prices(db, pais)

    background_tasks.add_task(scrape_and_build, req.pais, req.max_records, db)
    return {"message": f"Scraping iniciado para {req.pais or 'todos los países'}", "status": "queued"}


@app.post("/admin/build-reference-prices")
def trigger_build_prices(pais: Optional[str] = None, db: Session = Depends(get_db)):
    from build_reference_prices import build_reference_prices
    result = build_reference_prices(db, pais)
    return {"status": "ok", **result}


@app.post("/admin/seed-precios")
def trigger_seed(db: Session = Depends(get_db)):
    from seed_precios import seed
    n = seed(db)
    total = db.query(__import__("models").PrecioReferencia).count()
    return {"status": "ok", "insertados": n, "total": total}


_obra_cache: dict = {}
_obra_cache.clear()

@app.get("/obra/{obra_id}")
def detalle_obra_analizado(obra_id: str, db: Session = Depends(get_db)):
    try:
        import uuid; uuid.UUID(obra_id)
    except ValueError:
        raise HTTPException(404, "Obra no encontrada")
    from models import ObraPublica, Empresa
    import decimal

    # Servir desde caché si existe
    if obra_id in _obra_cache:
        return _obra_cache[obra_id]

    obra = db.query(ObraPublica).filter_by(id=obra_id).first()
    if not obra or obra.fuente in ("SECOP", "SECOP1"):
        raise HTTPException(404, "Obra no encontrada")

    empresa_nombre = None
    if obra.empresa_id:
        emp = db.query(Empresa).filter_by(id=obra.empresa_id).first()
        if emp:
            empresa_nombre = emp.nombre_canónico

    def _clean(obj):
        if isinstance(obj, decimal.Decimal): return float(obj)
        if isinstance(obj, dict):  return {k: _clean(v) for k, v in obj.items()}
        if isinstance(obj, list):  return [_clean(i) for i in obj]
        return obj

    items_raw = obra.items or []
    if items_raw:
        # include_sources=False evita la búsqueda costosa en Python por obra
        result           = analyze(db, items_raw, obra.pais, include_sources=False)
        items_analizados = _clean(result.items)
        total_oficial    = float(result.total_cotizado)
        total_ref        = float(result.total_referencia)
        cobertura        = result.cobertura_pct
    else:
        items_analizados = []
        total_oficial    = float(obra.monto_adjudicado or 0)
        total_ref        = 0.0
        cobertura        = 0.0

    payload = {
        "id":                str(obra.id),
        "titulo":            obra.titulo,
        "pais":              obra.pais,
        "entidad_compradora":obra.entidad_compradora,
        "empresa_nombre":    empresa_nombre,
        "empresa_id":        str(obra.empresa_id) if obra.empresa_id else None,
        "monto_adjudicado":  float(obra.monto_adjudicado) if obra.monto_adjudicado else None,
        "moneda":            obra.moneda,
        "fecha_adjudicacion":str(obra.fecha_adjudicacion) if obra.fecha_adjudicacion else None,
        "url_fuente":        obra.url_fuente,
        "pdf_url":           obra.pdf_url,
        "fuente":            obra.fuente,
        "sobreprecio_score": float(obra.sobreprecio_score) if obra.sobreprecio_score else 0,
        "items":             items_analizados,
        "total_oficial":     total_oficial,
        "total_referencia":  total_ref,
        "diferencia":        total_oficial - total_ref,
        "cobertura_pct":     cobertura,
    }

    # Guardar en caché (máx 500 entradas)
    if len(_obra_cache) > 500:
        _obra_cache.clear()
    _obra_cache[obra_id] = payload
    return payload


@app.get("/obra/{obra_id}/contrato-ia")
def generar_contrato_ia(obra_id: str, db: Session = Depends(get_db)):
    try:
        import uuid; uuid.UUID(obra_id)
    except ValueError:
        raise HTTPException(404, "Obra no encontrada")
    from models import ObraPublica
    import decimal, json as _json

    obra = db.query(ObraPublica).filter_by(id=obra_id).first()
    if not obra:
        raise HTTPException(404, "Obra no encontrada")

    def _clean(obj):
        if isinstance(obj, decimal.Decimal): return float(obj)
        if isinstance(obj, dict):  return {k: _clean(v) for k, v in obj.items()}
        if isinstance(obj, list):  return [_clean(i) for i in obj]
        return obj

    items_raw = obra.items or []
    original = {
        "titulo":            obra.titulo,
        "descripcion":       obra.descripcion,
        "entidad_compradora": obra.entidad_compradora,
        "monto_adjudicado":  float(obra.monto_adjudicado) if obra.monto_adjudicado else None,
        "moneda":            obra.moneda,
        "fecha_adjudicacion": str(obra.fecha_adjudicacion) if obra.fecha_adjudicacion else None,
        "numero_contrato":   obra.numero_contrato,
        "items":             _clean(items_raw),
    }

    if items_raw:
        result = analyze(db, items_raw, obra.pais)
        ia_items = []
        for item in result.items:
            ref = float(item.get("precio_referencia") or 0)
            ia_items.append({
                "descripcion":     item["descripcion"],
                "unidad":          item.get("unidad", ""),
                "cantidad":        float(item.get("cantidad", 1)),
                "precio_unitario": ref if ref > 0 else float(item.get("precio_unitario", 0)),
                "precio_oficial":  float(item.get("precio_unitario", 0)),
                "tiene_referencia": ref > 0,
                "sobreprecio_pct": float(item["sobreprecio_pct"]) if item.get("sobreprecio_pct") is not None else None,
                "semaforo":        item.get("semaforo", "sin_referencia"),
                "n_muestras":      item.get("n_muestras", 0),
            })
        ia = {
            "items":          ia_items,
            "total":          float(result.total_referencia),
            "cobertura_pct":  result.cobertura_pct,
            "generado_por":   "precios_referencia",
            "notas":          f"Basado en {result.items_con_ref} de {result.items_total} ítems con precio histórico de referencia.",
        }
    else:
        from narrator import groq as _groq
        NOMBRES = {"MX": "México", "GT": "Guatemala", "SV": "El Salvador", "PE": "Perú"}
        pais_nombre = NOMBRES.get(obra.pais, obra.pais)
        monto = float(obra.monto_adjudicado or 0)
        desc_line = f"Descripción: {obra.descripcion}" if obra.descripcion else ""

        prompt = f"""Eres un experto en contratación pública de {pais_nombre}.

Contrato gubernamental: "{obra.titulo}"
Entidad compradora: {obra.entidad_compradora or 'N/A'}
Monto adjudicado: {obra.moneda} {monto:,.2f}
{desc_line}

Genera un desglose de ítems típico y razonable para este tipo de contrato gubernamental.
Para cada ítem incluye descripción clara, cantidad, unidad y precio unitario estimado en {obra.moneda}.
Los precios deben ser realistas según el mercado de {pais_nombre} en 2024.

Responde SOLO con JSON válido:
{{
  "items": [
    {{"descripcion": "...", "cantidad": 1, "unidad": "...", "precio_unitario": 0}},
    ...
  ],
  "notas": "Breve nota metodológica en 1 oración"
}}

Máximo 8 ítems principales. Los totales deben aproximarse al monto del contrato."""

        try:
            resp = _groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1024,
                response_format={"type": "json_object"},
            )
            ia_data = _json.loads(resp.choices[0].message.content)
            raw_items = ia_data.get("items", [])
            ia = {
                "items": [{
                    "descripcion":     i.get("descripcion", ""),
                    "unidad":          i.get("unidad", ""),
                    "cantidad":        float(i.get("cantidad", 1)),
                    "precio_unitario": float(i.get("precio_unitario", 0)),
                    "precio_oficial":  None,
                    "tiene_referencia": True,
                    "sobreprecio_pct": None,
                    "semaforo":        "sin_referencia",
                    "n_muestras":      0,
                } for i in raw_items],
                "total":          sum(float(i.get("precio_unitario", 0)) * float(i.get("cantidad", 1)) for i in raw_items),
                "cobertura_pct":  100,
                "generado_por":   "ia_llm",
                "notas":          ia_data.get("notas", "Generado por IA basado en precios de mercado típicos."),
            }
        except Exception as e:
            raise HTTPException(500, f"Error generando estimación IA: {e}")

    return {"original": original, "ia": ia}


@app.get("/cotizaciones/{cotizacion_id}")
def get_cotizacion(cotizacion_id: str, db: Session = Depends(get_db)):
    from models import Cotizacion
    cot = db.query(Cotizacion).filter_by(id=cotizacion_id).first()
    if not cot:
        raise HTTPException(404, "Cotización no encontrada")
    return {
        "id": cot.id, "sobreprecio_score": float(cot.sobreprecio_score) if cot.sobreprecio_score else 0,
        "sobreprecio_pct": float(cot.sobreprecio_pct) if cot.sobreprecio_pct else 0,
        "pais": cot.pais, "moneda": cot.moneda, "narrativa_ia": cot.narrativa_ia,
        "items": cot.items, "resultado": cot.resultado, "created_at": str(cot.created_at),
    }


@app.get("/obra/{obra_id}/score-categoria")
def score_por_categoria(
    obra_id: str,
    genera_ia: bool = Query(True, description="Genera narrativa IA (puede tardar ~2s más)"),
    db: Session = Depends(get_db),
):
    """
    Compara el monto de una obra contra la distribución percentílica de contratos
    con la misma categoría y país. Retorna score de riesgo 0-100, percentil,
    contratos similares cercanos en monto y narrativa IA explicativa.
    """
    try:
        import uuid; uuid.UUID(obra_id)
    except ValueError:
        raise HTTPException(404, "Obra no encontrada")

    from models import ObraPublica
    obra = db.query(ObraPublica).filter_by(id=obra_id).first()
    if not obra:
        raise HTTPException(404, "Obra no encontrada")
    if not obra.monto_adjudicado or float(obra.monto_adjudicado) <= 0:
        raise HTTPException(422, "La obra no tiene monto adjudicado registrado")

    from categoria_scoring import score_by_category
    r = score_by_category(
        db         = db,
        obra_id    = obra_id,
        monto      = float(obra.monto_adjudicado),
        pais       = obra.pais,
        categoria  = obra.categoria,
        genera_ia  = genera_ia,
    )

    return {
        "obra_id":        obra_id,
        "score":          r.score,
        "semaforo":       r.semaforo,
        "percentil":      r.percentil,
        "monto":          r.monto,
        "mediana":        r.mediana,
        "p10":            r.p10,
        "p25":            r.p25,
        "p75":            r.p75,
        "p90":            r.p90,
        "min_monto":      r.min_monto,
        "max_monto":      r.max_monto,
        "n_contratos":    r.n_contratos,
        "sobreprecio_pct": r.sobreprecio_pct,
        "categoria":      r.categoria,
        "pais":           r.pais,
        "alertas":        r.alertas,
        "ejemplos":       r.ejemplos,
        "narrativa_ia":   r.narrativa_ia,
    }


@app.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook que recibe mensajes desde Make.com (conectado a WhatsApp Business Cloud).

    Payload esperado:
      { "from": "+502...", "body": "texto", "type": "text|image",
        "media_url": "https://...", "media_type": "image/jpeg" }

    Respuesta:
      { "reply": "texto para WhatsApp", "to": "+502..." }
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(400, "JSON inválido o mal formado")

    from whatsapp import handle_whatsapp_message
    reply = await handle_whatsapp_message(
        body       = payload.get("body") or payload.get("text"),
        media_url  = payload.get("media_url"),
        media_type = payload.get("media_type"),
        sender     = payload.get("from", "unknown"),
        db         = db,
    )
    return {"reply": reply, "to": payload.get("from")}


@app.get("/admin/scrape/status")
def scrape_status(db: Session = Depends(get_db)):
    return crud.get_scraping_logs(db)
