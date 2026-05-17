from __future__ import annotations
from dataclasses import dataclass, field
from sqlalchemy import text
from sqlalchemy.orm import Session


_REF_QUERY = text("""
    SELECT
        descripcion,
        precio_mediana,
        precio_p25,
        precio_p75,
        desviacion_std,
        n_muestras,
        fuente,
        similarity(lower(unaccent(descripcion)), lower(unaccent(:query))) AS sim
    FROM precios_referencia
    WHERE
        (:pais IS NULL OR pais = :pais OR pais IS NULL)
        AND similarity(lower(unaccent(descripcion)), lower(unaccent(:query))) > 0.20
    ORDER BY sim DESC
    LIMIT 1
""")


def _find_reference(db: Session, descripcion: str, pais: str | None) -> dict | None:
    try:
        row = db.execute(_REF_QUERY, {"query": descripcion.strip(), "pais": pais}).fetchone()
        return row._asdict() if row else None
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        # Fallback: búsqueda simple sin pg_trgm
        return _find_reference_simple(db, descripcion, pais)


def _find_reference_simple(db: Session, descripcion: str, pais: str | None) -> dict | None:
    """Fallback sin pg_trgm: busca por palabras clave."""
    try:
        from models import PrecioReferencia
        words = [w for w in descripcion.lower().split() if len(w) > 3][:3]
        if not words:
            return None
        query = db.query(PrecioReferencia)
        if pais:
            query = query.filter(
                (PrecioReferencia.pais == pais) | (PrecioReferencia.pais == None)
            )
        refs = query.limit(200).all()
        best, best_score = None, 0
        desc_words = set(descripcion.lower().split())
        for ref in refs:
            ref_words = set(ref.descripcion.lower().split())
            overlap = len(desc_words & ref_words) / max(len(desc_words), len(ref_words), 1)
            if overlap > best_score and overlap > 0.2:
                best_score = overlap
                best = ref
        if best:
            return {
                "descripcion":    best.descripcion,
                "precio_mediana": best.precio_mediana,
                "precio_p25":     best.precio_p25,
                "precio_p75":     best.precio_p75,
                "desviacion_std": best.desviacion_std,
                "n_muestras":     best.n_muestras,
                "fuente":         best.fuente,
            }
        return None
    except Exception:
        return None


def _find_source_contracts(db: Session, descripcion: str, pais: str | None, limit: int = 4) -> list[dict]:
    """Devuelve obras_publicas que tienen items similares (transparencia de fuente)."""
    try:
        from models import ObraPublica
        desc_words = {w for w in descripcion.lower().split() if len(w) > 2}
        if not desc_words:
            return []
        q = db.query(ObraPublica).filter(ObraPublica.items.isnot(None))
        if pais:
            q = q.filter(ObraPublica.pais == pais)
        obras = q.limit(400).all()
        matches = []
        for obra in obras:
            items = obra.items if isinstance(obra.items, list) else []
            for item in items:
                iw = {w for w in (item.get("descripcion") or "").lower().split() if len(w) > 2}
                if not iw:
                    continue
                overlap = len(desc_words & iw) / max(len(desc_words), len(iw), 1)
                if overlap >= 0.35:
                    try:
                        pu = float(item.get("precio_unitario") or 0)
                    except (TypeError, ValueError):
                        pu = 0.0
                    if pu > 0:
                        matches.append({
                            "obra_id":    str(obra.id),
                            "titulo":     obra.titulo,
                            "entidad":    obra.entidad_compradora,
                            "pais":       obra.pais,
                            "fecha":      str(obra.fecha_adjudicacion) if obra.fecha_adjudicacion else None,
                            "url_fuente": obra.url_fuente,
                            "precio_unitario":       round(pu, 2),
                            "descripcion_encontrada": item.get("descripcion"),
                            "unidad":     item.get("unidad"),
                            "_score":     overlap,
                        })
                        break  # una coincidencia por obra
        matches.sort(key=lambda x: x.pop("_score"), reverse=True)
        return matches[:limit]
    except Exception:
        return []


def _overprice_score(precio: float, mediana: float, std: float | None) -> float:
    if mediana <= 0:
        return 0.0
    sigma = std if (std and std > 0) else mediana * 0.20
    z = (precio - mediana) / sigma
    if z <= 1.0:  return max(0.0, z * 20)
    if z <= 2.0:  return 20 + (z - 1.0) * 30
    if z <= 4.0:  return 50 + (z - 2.0) * 15
    return min(100.0, 80 + (z - 4.0) * 5)


def _semaforo(score: float) -> str:
    if score < 20: return "verde"
    if score < 50: return "amarillo"
    if score < 80: return "naranja"
    return "rojo"


@dataclass
class AnalysisResult:
    items:            list[dict]
    score_general:    float = 0.0
    sobreprecio_pct:  float = 0.0
    total_cotizado:   float = 0.0
    total_referencia: float = 0.0
    items_con_ref:    int   = 0
    items_total:      int   = 0
    cobertura_pct:    float = 0.0
    alertas:          list[str] = field(default_factory=list)


def analyze(db: Session, items: list[dict], pais: str | None, include_sources: bool = True) -> AnalysisResult:
    enriched = []
    total_cot = total_ref = 0.0
    scores: list[float] = []

    for item in items:
        pu  = float(item.get("precio_unitario") or 0)
        qty = float(item.get("cantidad") or 1)
        pt  = float(item.get("precio_total") or pu * qty)

        ref = _find_reference(db, item.get("descripcion", ""), pais)

        row = {**item, "referencia": None, "semaforo": "sin_referencia",
               "sobreprecio_pct": None, "sobreprecio_score": None}

        if ref and ref.get("precio_mediana") and float(ref["precio_mediana"]) > 0:
            med  = float(ref["precio_mediana"])
            std  = float(ref["desviacion_std"]) if ref.get("desviacion_std") else None
            sc   = _overprice_score(pu, med, std)
            spct = (pu - med) / med * 100

            fuentes = _find_source_contracts(db, item.get("descripcion", ""), pais) if include_sources else []

            row.update({
                "referencia":          ref,
                "precio_referencia":   med,
                "sobreprecio_pct":     round(spct, 2),
                "sobreprecio_score":   round(sc, 2),
                "semaforo":            _semaforo(sc),
                "contratos_referencia": fuentes,
            })
            scores.append(sc)
            total_cot += pt
            total_ref += med * qty

        enriched.append(row)

    score_gral = sum(scores) / len(scores) if scores else 0.0
    sp_total   = (total_cot - total_ref) / total_ref * 100 if total_ref > 0 else 0.0
    cobertura  = len(scores) / len(items) * 100 if items else 0.0

    alertas: list[str] = []
    rojos = [i for i in enriched if i["semaforo"] == "rojo"]
    if rojos:
        alertas.append(f"{len(rojos)} ítem(s) con sobreprecio severo: " +
                       ", ".join(i["descripcion"][:40] for i in rojos[:3]))
    if cobertura < 40:
        alertas.append("Cobertura de referencias baja. Resultados orientativos.")

    return AnalysisResult(
        items            = enriched,
        score_general    = round(score_gral, 2),
        sobreprecio_pct  = round(sp_total, 2),
        total_cotizado   = round(total_cot, 2),
        total_referencia = round(total_ref, 2),
        items_con_ref    = len(scores),
        items_total      = len(items),
        cobertura_pct    = round(cobertura, 1),
        alertas          = alertas,
    )
