from __future__ import annotations
import json
import os
from dataclasses import dataclass, field
from sqlalchemy import text
from sqlalchemy.orm import Session

_PAIS_NOMBRES = {"GT": "Guatemala", "SV": "El Salvador", "MX": "México", "PE": "Perú"}
_MONEDAS      = {"GT": "GTQ", "SV": "USD", "MX": "MXN", "PE": "PEN"}

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
        AND similarity(lower(unaccent(descripcion)), lower(unaccent(:query))) > 0.38
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
        return _find_reference_simple(db, descripcion, pais)


def _find_reference_simple(db: Session, descripcion: str, pais: str | None) -> dict | None:
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
            if overlap > best_score and overlap > 0.38:
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


def _fetch_prices_groq(items: list[dict], pais: str, db_context: list[dict] | None = None) -> dict[int, dict]:
    """Busca precios de mercado usando Groq, anclado a los precios conocidos de la DB."""
    from groq import Groq

    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
    pais_nombre = _PAIS_NOMBRES.get(pais, pais)

    items_list = "\n".join(
        f"{i + 1}. {item['descripcion']} (unidad: {item.get('unidad', 'unidad')})"
        for i, item in enumerate(items)
    )

    # Contexto ancla: precios ya validados en la DB para este país
    anchor_block = ""
    if db_context:
        anchor_lines = "\n".join(
            f"- {c['descripcion']}: ${c['precio_mediana']:.2f} USD (rango ${c.get('precio_p25') or c['precio_mediana']*0.8:.2f}–${c.get('precio_p75') or c['precio_mediana']*1.25:.2f})"
            for c in db_context[:15]
        )
        anchor_block = f"""
PRECIOS DE REFERENCIA VALIDADOS PARA {pais_nombre.upper()} (en USD):
{anchor_lines}

Usa estos precios como ancla para calibrar tus estimaciones. Tus respuestas deben ser coherentes con este rango de precios — no estimes valores que contradigan drásticamente estos datos validados.
"""

    prompt = f"""Eres un experto en precios de mercado de contratación pública en {pais_nombre}.
{anchor_block}
Para cada ítem de la lista, estima el precio unitario de mercado en {pais_nombre} en 2024-2025.

Ítems a estimar:
{items_list}

Responde SOLO con JSON válido (sin markdown):
{{
  "precios": [
    {{
      "item": 1,
      "precio_unitario_mercado": 0.0,
      "precio_p25": 0.0,
      "precio_p75": 0.0,
      "confianza": "alta|media|baja",
      "fuente_referencia": "descripción breve de la fuente"
    }}
  ]
}}

REGLAS ESTRICTAS:
- Todos los precios en USD (dólares americanos).
- Sé consistente con los precios ancla de referencia mostrados arriba.
- confianza "alta": precio bien conocido | "media": estimación razonable | "baja": incertidumbre alta
- precio_p25 = percentil bajo del rango, precio_p75 = percentil alto
- Si el ítem no tiene precio posible usa 0."""

    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=3000,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        result: dict[int, dict] = {}
        for p in data.get("precios", []):
            idx = int(p.get("item", 0)) - 1
            med = float(p.get("precio_unitario_mercado", 0) or 0)
            if 0 <= idx < len(items) and med > 0:
                p25 = float(p.get("precio_p25") or med * 0.80)
                p75 = float(p.get("precio_p75") or med * 1.25)
                result[idx] = {
                    "descripcion":    items[idx]["descripcion"],
                    "precio_mediana": med,
                    "precio_p25":     p25,
                    "precio_p75":     p75,
                    "desviacion_std": None,
                    "n_muestras":     0,
                    "fuente":         f"IA ({pais_nombre}): {p.get('fuente_referencia', 'estimación de mercado')}",
                    "confianza":      p.get("confianza", "media"),
                    "es_estimacion_ia": True,
                }
        return result
    except Exception:
        return {}


def _find_source_contracts(db: Session, descripcion: str, pais: str | None, limit: int = 4) -> list[dict]:
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
                            "obra_id":               str(obra.id),
                            "titulo":                obra.titulo,
                            "entidad":               obra.entidad_compradora,
                            "pais":                  obra.pais,
                            "fecha":                 str(obra.fecha_adjudicacion) if obra.fecha_adjudicacion else None,
                            "url_fuente":            obra.url_fuente,
                            "precio_unitario":       round(pu, 2),
                            "descripcion_encontrada": item.get("descripcion"),
                            "unidad":                item.get("unidad"),
                            "_score":                overlap,
                        })
                        break
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
    if not items:
        return AnalysisResult(items=[], alertas=["No se encontraron ítems en el documento."])

    # ── 1. Total cotizado real: siempre suma los precios del documento ──
    total_cot = 0.0
    for item in items:
        pu  = float(item.get("precio_unitario") or 0)
        qty = float(item.get("cantidad") or 1)
        pt  = float(item.get("precio_total") or pu * qty)
        total_cot += pt

    # ── 2. Buscar referencias en la DB para cada ítem ──
    db_refs: dict[int, dict] = {}
    for i, item in enumerate(items):
        ref = _find_reference(db, item.get("descripcion", ""), pais)
        if ref and ref.get("precio_mediana") and float(ref["precio_mediana"]) > 0:
            db_refs[i] = ref

    # ── 3. Ítems sin referencia en DB → Groq anclado a los precios conocidos ──
    no_ref_indices = [i for i in range(len(items)) if i not in db_refs]
    groq_refs: dict[int, dict] = {}
    if no_ref_indices:
        no_ref_items = [items[i] for i in no_ref_indices]
        # Pasar los precios ya validados en DB como ancla para Groq
        db_context = [
            {
                "descripcion":    ref["descripcion"],
                "precio_mediana": float(ref["precio_mediana"]),
                "precio_p25":     float(ref["precio_p25"]) if ref.get("precio_p25") else None,
                "precio_p75":     float(ref["precio_p75"]) if ref.get("precio_p75") else None,
            }
            for ref in db_refs.values()
            if ref.get("precio_mediana")
        ]
        groq_prices = _fetch_prices_groq(no_ref_items, pais or "GT", db_context=db_context or None)
        for local_j, original_i in enumerate(no_ref_indices):
            if local_j in groq_prices:
                groq_refs[original_i] = groq_prices[local_j]

    # ── 4. Construir ítems enriquecidos ──
    enriched   = []
    total_ref  = 0.0
    scores: list[float] = []

    for i, item in enumerate(items):
        pu  = float(item.get("precio_unitario") or 0)
        qty = float(item.get("cantidad") or 1)
        pt  = float(item.get("precio_total") or pu * qty)

        ref = db_refs.get(i) or groq_refs.get(i)

        row = {
            **item,
            "referencia":       None,
            "precio_referencia": None,
            "semaforo":         "sin_referencia",
            "sobreprecio_pct":  None,
            "sobreprecio_score": None,
            "es_estimacion_ia": False,
        }

        if ref and ref.get("precio_mediana") and float(ref["precio_mediana"]) > 0:
            med = float(ref["precio_mediana"])
            std = float(ref["desviacion_std"]) if ref.get("desviacion_std") else None
            sc  = _overprice_score(pu, med, std)
            spct = (pu - med) / med * 100

            fuentes = (
                _find_source_contracts(db, item.get("descripcion", ""), pais)
                if include_sources else []
            )

            row.update({
                "referencia":           ref,
                "precio_referencia":    med,
                "sobreprecio_pct":      round(spct, 2),
                "sobreprecio_score":    round(sc, 2),
                "semaforo":             _semaforo(sc),
                "contratos_referencia": fuentes,
                "fuente_ref":           ref.get("fuente", ""),
                "es_estimacion_ia":     i in groq_refs,
                "confianza_ref":        ref.get("confianza", "alta") if i in groq_refs else "alta",
            })
            scores.append(sc)
            total_ref += med * qty

        enriched.append(row)

    score_gral = sum(scores) / len(scores) if scores else 0.0
    sp_total   = (total_cot - total_ref) / total_ref * 100 if total_ref > 0 else 0.0
    cobertura  = len(scores) / len(items) * 100 if items else 0.0

    alertas: list[str] = []
    rojos = [i for i in enriched if i["semaforo"] == "rojo"]
    if rojos:
        alertas.append(
            f"{len(rojos)} ítem(s) con sobreprecio severo: "
            + ", ".join(i["descripcion"][:40] for i in rojos[:3])
        )
    if cobertura < 40 and not groq_refs:
        alertas.append("Cobertura de referencias baja. Resultados orientativos.")
    if groq_refs:
        alertas.append(
            f"{len(groq_refs)} precio(s) de referencia estimados por IA ({_PAIS_NOMBRES.get(pais or 'GT', pais)})."
        )

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
