"""
Pipeline: obras_publicas.items → precios_referencia

Lee todos los contratos indexados, extrae precios unitarios por ítem,
calcula estadísticas (mediana, p25, p75, std) y hace upsert en
precios_referencia. Se ejecuta automáticamente después de cada scraping.
"""
from __future__ import annotations
import statistics
from datetime import datetime
from sqlalchemy.orm import Session
from models import ObraPublica, PrecioReferencia

MONEDAS   = {"GT": "GTQ", "SV": "USD", "MX": "MXN", "PE": "PEN"}
MIN_MUESTRAS = 2   # necesitamos al menos 2 para calcular estadística


def _norm(desc: str) -> str:
    return " ".join(desc.lower().split())[:200]


def build_reference_prices(db: Session, pais: str | None = None) -> dict:
    """
    Construye / actualiza precios_referencia desde obras_publicas.
    Retorna resumen con conteos.
    """
    q = db.query(ObraPublica).filter(ObraPublica.items.isnot(None))
    if pais:
        q = q.filter(ObraPublica.pais == pais.upper())
    obras = q.all()

    # Agrupamos: (descripcion_normalizada, pais) → lista de precios
    grupos: dict[tuple[str, str], dict] = {}

    for obra in obras:
        items = obra.items
        if not isinstance(items, list):
            continue
        p = obra.pais or "GT"

        for item in items:
            desc = (item.get("descripcion") or "").strip()
            if not desc:
                continue
            try:
                pu = float(item.get("precio_unitario") or 0)
            except (TypeError, ValueError):
                continue
            if pu <= 0:
                continue

            key = (_norm(desc), p)
            if key not in grupos:
                grupos[key] = {
                    "desc_display": desc,
                    "unidad":  item.get("unidad") or "",
                    "pais":    p,
                    "moneda":  MONEDAS.get(p, "USD"),
                    "precios": [],
                }
            grupos[key]["precios"].append(pu)

    creados = actualizados = omitidos = 0

    for (desc_norm, pais_obra), data in grupos.items():
        precios = data["precios"]
        if len(precios) < MIN_MUESTRAS:
            omitidos += 1
            continue

        ps = sorted(precios)
        n  = len(ps)
        med  = statistics.median(ps)
        std  = statistics.stdev(ps) if n > 1 else med * 0.15
        p25  = ps[max(0, int(n * 0.25))]
        p75  = ps[min(n - 1, int(n * 0.75))]

        existing = (
            db.query(PrecioReferencia)
            .filter_by(descripcion=desc_norm, pais=pais_obra)
            .first()
        )

        if existing:
            existing.precio_mediana       = med
            existing.precio_p25           = p25
            existing.precio_p75           = p75
            existing.precio_min           = ps[0]
            existing.precio_max           = ps[-1]
            existing.desviacion_std       = std
            existing.n_muestras           = n
            existing.ultima_actualizacion = datetime.utcnow()
            actualizados += 1
        else:
            db.add(PrecioReferencia(
                descripcion       = desc_norm,
                unidad            = data["unidad"],
                pais              = pais_obra,
                moneda            = data["moneda"],
                precio_mediana    = med,
                precio_p25        = p25,
                precio_p75        = p75,
                precio_min        = ps[0],
                precio_max        = ps[-1],
                desviacion_std    = std,
                n_muestras        = n,
                fuente            = "obras_publicas",
            ))
            creados += 1

    db.commit()

    return {
        "obras_procesadas":        len(obras),
        "grupos_encontrados":      len(grupos),
        "referencias_creadas":     creados,
        "referencias_actualizadas": actualizados,
        "omitidas_pocas_muestras": omitidos,
    }
