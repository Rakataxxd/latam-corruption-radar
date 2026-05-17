from __future__ import annotations
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, BackgroundTasks, Query, Depends
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


app = FastAPI(title="LatAm Corruption Radar API", version="1.0.0", lifespan=lifespan)

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


@app.get("/obras")
def listar_obras(
    pais:      Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    min_score: float         = Query(0),
    page:      int           = Query(1, ge=1),
    page_size: int           = Query(20, ge=1, le=100),
    order_by:  str           = Query("sobreprecio_score"),
    db: Session = Depends(get_db),
):
    items, total = crud.list_obras(
        db, pais=pais, categoria=categoria,
        min_score=min_score, page=page,
        page_size=page_size, order_by=order_by,
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@app.get("/empresa/{empresa_id}")
def detalle_empresa(empresa_id: str, db: Session = Depends(get_db)):
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
    background_tasks.add_task(run_scraper, req.pais, req.max_records, db)
    return {"message": f"Scraping iniciado para {req.pais or 'todos los países'}", "status": "queued"}


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


@app.get("/admin/scrape/status")
def scrape_status(db: Session = Depends(get_db)):
    return crud.get_scraping_logs(db)
