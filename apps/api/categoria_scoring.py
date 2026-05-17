from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session


# ── SQL ───────────────────────────────────────────────────────────────────────

_STATS_SQL_CAT = text("""
    SELECT
        percentile_cont(0.10) WITHIN GROUP (ORDER BY monto_adjudicado) AS p10,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY monto_adjudicado) AS p25,
        percentile_cont(0.50) WITHIN GROUP (ORDER BY monto_adjudicado) AS p50,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY monto_adjudicado) AS p75,
        percentile_cont(0.90) WITHIN GROUP (ORDER BY monto_adjudicado) AS p90,
        stddev(monto_adjudicado)                                        AS std_dev,
        count(*)                                                        AS n_contratos,
        avg(monto_adjudicado)                                           AS promedio,
        min(monto_adjudicado)                                           AS min_monto,
        max(monto_adjudicado)                                           AS max_monto
    FROM obras_publicas
    WHERE pais            = :pais
      AND monto_adjudicado > 0
      AND id::text        != :obra_id
      AND categoria        ILIKE :categoria
""")

_STATS_SQL_NOCATEGORIA = text("""
    SELECT
        percentile_cont(0.10) WITHIN GROUP (ORDER BY monto_adjudicado) AS p10,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY monto_adjudicado) AS p25,
        percentile_cont(0.50) WITHIN GROUP (ORDER BY monto_adjudicado) AS p50,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY monto_adjudicado) AS p75,
        percentile_cont(0.90) WITHIN GROUP (ORDER BY monto_adjudicado) AS p90,
        stddev(monto_adjudicado)                                        AS std_dev,
        count(*)                                                        AS n_contratos,
        avg(monto_adjudicado)                                           AS promedio,
        min(monto_adjudicado)                                           AS min_monto,
        max(monto_adjudicado)                                           AS max_monto
    FROM obras_publicas
    WHERE pais            = :pais
      AND monto_adjudicado > 0
      AND id::text        != :obra_id
""")

_PERCENTIL_SQL_CAT = text("""
    SELECT ROUND(
        (SELECT COUNT(*) FROM obras_publicas
          WHERE pais = :pais AND monto_adjudicado < :monto AND monto_adjudicado > 0
            AND categoria ILIKE :categoria
        ) * 100.0 /
        NULLIF(
          (SELECT COUNT(*) FROM obras_publicas
            WHERE pais = :pais AND monto_adjudicado > 0
              AND categoria ILIKE :categoria
          ), 0
        )
    , 1) AS percentil
""")

_PERCENTIL_SQL_NOCAT = text("""
    SELECT ROUND(
        (SELECT COUNT(*) FROM obras_publicas
          WHERE pais = :pais AND monto_adjudicado < :monto AND monto_adjudicado > 0
        ) * 100.0 /
        NULLIF(
          (SELECT COUNT(*) FROM obras_publicas
            WHERE pais = :pais AND monto_adjudicado > 0
          ), 0
        )
    , 1) AS percentil
""")

_EJEMPLOS_SQL_CAT = text("""
    SELECT titulo, entidad_compradora, monto_adjudicado, moneda, fecha_adjudicacion, id::text AS obra_id
    FROM obras_publicas
    WHERE pais            = :pais
      AND monto_adjudicado > 0
      AND id::text        != :obra_id
      AND categoria        ILIKE :categoria
    ORDER BY ABS(monto_adjudicado - :monto) ASC
    LIMIT 5
""")

_EJEMPLOS_SQL_NOCAT = text("""
    SELECT titulo, entidad_compradora, monto_adjudicado, moneda, fecha_adjudicacion, id::text AS obra_id
    FROM obras_publicas
    WHERE pais            = :pais
      AND monto_adjudicado > 0
      AND id::text        != :obra_id
    ORDER BY ABS(monto_adjudicado - :monto) ASC
    LIMIT 5
""")


# ── Data class ────────────────────────────────────────────────────────────────

@dataclass
class CategoryScore:
    score:           float
    semaforo:        str
    percentil:       float
    monto:           float
    mediana:         float
    p10:             float
    p25:             float
    p75:             float
    p90:             float
    min_monto:       float
    max_monto:       float
    n_contratos:     int
    sobreprecio_pct: float
    categoria:       Optional[str]
    pais:            str
    alertas:         list[str]
    ejemplos:        list[dict]
    narrativa_ia:    Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _semaforo(score: float) -> str:
    if score < 20: return "verde"
    if score < 50: return "amarillo"
    if score < 80: return "naranja"
    return "rojo"


def _score_from_percentil(p: float) -> float:
    """
    Convierte percentil (0-100) → score de riesgo (0-100).
    Contratos bajo la mediana tienen score ≈ 0.
    Por encima del P90 empiezan a entrar en zona roja.
    """
    if p < 50:  return 0.0
    if p < 70:  return (p - 50) / 20 * 20           # 0–20 amarillo
    if p < 85:  return 20 + (p - 70) / 15 * 30      # 20–50 naranja bajo
    if p < 95:  return 50 + (p - 85) / 10 * 30      # 50–80 naranja alto
    return min(100.0, 80 + (p - 95) / 5 * 20)       # 80–100 rojo


# ── Motor principal ───────────────────────────────────────────────────────────

def score_by_category(
    db: Session,
    obra_id: str,
    monto: float,
    pais: str,
    categoria: Optional[str],
    genera_ia: bool = True,
) -> CategoryScore:

    base_params = {"pais": pais, "obra_id": obra_id}
    has_cat = bool(categoria and categoria.strip())
    cat_param = f"%{categoria.strip()}%" if has_cat else None

    # ── Stats de distribución ─────────────────────────────────────────────────
    try:
        if has_cat:
            row = db.execute(_STATS_SQL_CAT, {**base_params, "categoria": cat_param}).fetchone()
        else:
            row = db.execute(_STATS_SQL_NOCATEGORIA, base_params).fetchone()
    except Exception:
        db.rollback()
        row = None

    if not row or not row.p50:
        return CategoryScore(
            score=0, semaforo="sin_datos", percentil=0,
            monto=monto, mediana=0, p10=0, p25=0, p75=0, p90=0,
            min_monto=0, max_monto=0, n_contratos=0, sobreprecio_pct=0,
            categoria=categoria, pais=pais,
            alertas=["Sin contratos similares en la base de datos para comparar."],
            ejemplos=[],
        )

    p10 = float(row.p10 or 0)
    p25 = float(row.p25 or 0)
    p50 = float(row.p50)
    p75 = float(row.p75 or 0)
    p90 = float(row.p90 or 0)
    n   = int(row.n_contratos)
    min_m = float(row.min_monto or 0)
    max_m = float(row.max_monto or 0)

    # ── Percentil de esta obra ────────────────────────────────────────────────
    try:
        pct_params = {**base_params, "monto": monto}
        if has_cat:
            pct_row = db.execute(_PERCENTIL_SQL_CAT, {**pct_params, "categoria": cat_param}).fetchone()
        else:
            pct_row = db.execute(_PERCENTIL_SQL_NOCAT, pct_params).fetchone()
        percentil = float(pct_row.percentil or 50) if pct_row else 50.0
    except Exception:
        db.rollback()
        percentil = 50.0

    score    = _score_from_percentil(percentil)
    sp_pct   = (monto - p50) / p50 * 100 if p50 > 0 else 0.0

    # ── Alertas ───────────────────────────────────────────────────────────────
    alertas: list[str] = []
    if percentil >= 90:
        alertas.append(
            f"Monto en percentil {percentil:.0f} — supera al {percentil:.0f}% de contratos similares"
        )
    if monto > p90 > 0:
        alertas.append(
            f"Excede el umbral P90 ({_fmt_monto(p90)}) en {_fmt_monto(monto - p90)}"
        )
    if n < 10:
        alertas.append(f"Muestra reducida ({n} contratos) — resultado orientativo")

    # ── Contratos similares más cercanos ──────────────────────────────────────
    try:
        ej_params = {**base_params, "monto": monto}
        if has_cat:
            ej_rows = db.execute(_EJEMPLOS_SQL_CAT, {**ej_params, "categoria": cat_param}).fetchall()
        else:
            ej_rows = db.execute(_EJEMPLOS_SQL_NOCAT, ej_params).fetchall()
        ejemplos = [
            {
                "obra_id":            r.obra_id,
                "titulo":             r.titulo,
                "entidad_compradora": r.entidad_compradora,
                "monto_adjudicado":   float(r.monto_adjudicado),
                "moneda":             r.moneda,
                "fecha":              str(r.fecha_adjudicacion) if r.fecha_adjudicacion else None,
                "diferencia_pct":     round((float(r.monto_adjudicado) - monto) / monto * 100, 1) if monto else 0,
            }
            for r in ej_rows
        ]
    except Exception:
        db.rollback()
        ejemplos = []

    # ── Narrativa IA ──────────────────────────────────────────────────────────
    narrativa = None
    if genera_ia and n >= 3:
        narrativa = _generate_narrative(
            pais=pais, categoria=categoria, monto=monto,
            p50=p50, p75=p75, p90=p90,
            percentil=percentil, score=score, n=n, alertas=alertas,
        )

    return CategoryScore(
        score        = round(score, 1),
        semaforo     = _semaforo(score),
        percentil    = percentil,
        monto        = monto,
        mediana      = p50,
        p10          = p10,
        p25          = p25,
        p75          = p75,
        p90          = p90,
        min_monto    = min_m,
        max_monto    = max_m,
        n_contratos  = n,
        sobreprecio_pct = round(sp_pct, 2),
        categoria    = categoria,
        pais         = pais,
        alertas      = alertas,
        ejemplos     = ejemplos,
        narrativa_ia = narrativa,
    )


# ── Helpers internos ──────────────────────────────────────────────────────────

def _fmt_monto(n: float) -> str:
    if n >= 1_000_000: return f"{n/1_000_000:.1f}M"
    if n >= 1_000:     return f"{n:,.0f}"
    return f"{n:.0f}"


def _generate_narrative(
    pais: str, categoria: Optional[str], monto: float,
    p50: float, p75: float, p90: float,
    percentil: float, score: float, n: int, alertas: list[str],
) -> Optional[str]:
    try:
        from narrator import groq, SYSTEM_PROMPT
        NOMBRES = {"MX": "México", "GT": "Guatemala", "SV": "El Salvador", "PE": "Perú"}
        cat_label   = categoria or "contratos gubernamentales"
        pais_nombre = NOMBRES.get(pais, pais)

        prompt = f"""Analiza este contrato de {pais_nombre} comparado con su categoría "{cat_label}":

Monto del contrato: {monto:,.0f}
Base de comparación: {n} contratos similares
Mediana de la categoría: {p50:,.0f}
Percentil 75: {p75:,.0f}
Percentil 90: {p90:,.0f}
Posición de este contrato: percentil {percentil:.0f}
Score de riesgo por categoría: {score:.0f}/100
Alertas: {'; '.join(alertas) if alertas else 'ninguna'}

Redactá el análisis comparativo en español claro para un ciudadano."""

        resp = groq.chat.completions.create(
            model    = "llama-3.3-70b-versatile",
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
            temperature = 0.5,
            max_tokens  = 350,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return None
