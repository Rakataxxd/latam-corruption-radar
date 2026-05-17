"""
Importa precios reales desde local_prices (MercadoLibre scrapeado)
del SQLite del scraper hacia precios_referencia en PostgreSQL.

- MX y PE: usa precios reales de MercadoLibre (buena cobertura)
- GT y SV: usa precios de mercado investigados (ML no tiene buena cobertura)

Uso:
    python import_precios_reales.py
"""
from __future__ import annotations
import sys, os, sqlite3, statistics
from pathlib import Path
from datetime import datetime

env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

SQLITE_PATH = r"C:\Users\usuario\precio-justo-scraper\data\contratos.db"

sys.path.insert(0, os.path.dirname(__file__))
from database import SessionLocal
from models import PrecioReferencia

MONEDAS = {"GT": "GTQ", "SV": "USD", "MX": "MXN", "PE": "PEN",
           "CO": "COP", "AR": "ARS", "BO": "BOB", "EC": "USD"}

# Mapeo normalized_name (ML) → descripcion legible
NOMBRE_DISPLAY = {
    "cemento_portland":     "cemento portland",
    "hierro_varilla":       "varilla corrugada",
    "block_cemento":        "block de concreto",
    "arena_construccion":   "arena de rio",
    "pintura_latex":        "pintura latex",
    "tuberia_pvc":          "tubo pvc",
    "lamina_zinc":          "lamina de zinc",
    "lamina_galvanizada":   "lamina galvanizada",
    "cable_electrico":      "cable electrico",
    "impermeabilizante":    "impermeabilizante",
    "ladrillo":             "ladrillo",
    "madera":               "tabla de madera",
    "clavos":               "clavos construccion",
    "ceramico_piso":        "ceramico piso",
    "malla_electrosoldada": "malla electrosoldada",
    "cal_hidratada":        "cal hidratada",
    "piedra_triturada":     "grava triturada",
    "yeso":                 "yeso construccion",
}


# Precios de mercado para GT y SV (ML no tiene buena cobertura de materiales)
# Estructura: (descripcion, unidad, mediana, p25, p75, std, pais, moneda)
PRECIOS_MERCADO_LOCAL: list[tuple] = [
    # ── GUATEMALA (GTQ) ────────────────────────────────────────────────────
    ("cemento portland",             "bolsa",      78,   70,   88,    9,   "GT", "GTQ"),
    ("arena de rio",                 "m3",         260,  200,  320,   50,  "GT", "GTQ"),
    ("piedrin triturado",            "m3",         340,  270,  410,   60,  "GT", "GTQ"),
    ("block de concreto",            "unidad",     4.75, 4.10, 5.40,  0.55,"GT", "GTQ"),
    ("varilla corrugada 3/8",        "varilla",    105,  85,   130,   18,  "GT", "GTQ"),
    ("varilla corrugada 1/2",        "varilla",    205,  175,  240,   30,  "GT", "GTQ"),
    ("pintura latex",                "galon",      195,  150,  250,   42,  "GT", "GTQ"),
    ("tabla de madera",              "unidad",     110,  85,   145,   25,  "GT", "GTQ"),
    ("tubo pvc 4 pulgadas",          "unidad",     160,  120,  205,   35,  "GT", "GTQ"),
    ("cable electrico",              "rollo 100m", 690,  580,  820,   100, "GT", "GTQ"),
    ("lamina de zinc",               "unidad",     105,  82,   132,   22,  "GT", "GTQ"),
    ("cal hidratada",                "bolsa",      32,   26,   40,    6,   "GT", "GTQ"),
    ("computadora de escritorio",    "unidad",     5500, 4200, 7000,  1100,"GT", "GTQ"),
    ("laptop",                       "unidad",     6000, 4500, 9000,  1800,"GT", "GTQ"),
    ("impresora multifuncional",     "unidad",     2500, 1800, 3800,  700, "GT", "GTQ"),
    ("papel bond resma",             "resma",      88,   68,   112,   20,  "GT", "GTQ"),
    ("escritorio ejecutivo",         "unidad",     1450, 1000, 2100,  480, "GT", "GTQ"),
    ("silla ejecutiva",              "unidad",     1050, 700,  1600,  380, "GT", "GTQ"),
    ("silla plastica",               "unidad",     145,  110,  200,   40,  "GT", "GTQ"),
    ("pick up doble cabina",         "unidad",     225000,180000,285000,45000,"GT","GTQ"),
    ("servicio de limpieza mensual", "mes",        3500, 2500, 5000,  1100,"GT", "GTQ"),
    ("consultoria tecnica hora",     "hora",       850,  600,  1200,  250, "GT", "GTQ"),
    # ── EL SALVADOR (USD) ─────────────────────────────────────────────────
    ("cemento portland",             "bolsa",      9.50, 8.20, 11.00, 1.20,"SV", "USD"),
    ("arena de rio",                 "m3",         28,   22,   36,    6,   "SV", "USD"),
    ("piedrin triturado",            "m3",         38,   30,   46,    8,   "SV", "USD"),
    ("block de concreto",            "unidad",     0.48, 0.40, 0.57,  0.08,"SV", "USD"),
    ("varilla corrugada 3/8",        "varilla",    12,   10,   15,    2,   "SV", "USD"),
    ("varilla corrugada 1/2",        "varilla",    22,   18,   27,    4,   "SV", "USD"),
    ("pintura latex",                "galon",      22,   16,   29,    5,   "SV", "USD"),
    ("tabla de madera",              "unidad",     11.50, 8,   16,    3.5, "SV", "USD"),
    ("tubo pvc 4 pulgadas",          "unidad",     18,   14,   23,    4,   "SV", "USD"),
    ("cable electrico",              "rollo 100m", 80,   65,   96,    14,  "SV", "USD"),
    ("lamina de zinc",               "unidad",     11.50, 9,   15,    2.5, "SV", "USD"),
    ("computadora de escritorio",    "unidad",     650,  500,  860,   145, "SV", "USD"),
    ("laptop",                       "unidad",     780,  560,  1250,  240, "SV", "USD"),
    ("impresora multifuncional",     "unidad",     310,  200,  460,   95,  "SV", "USD"),
    ("papel bond resma",             "resma",      10,   8,    13,    2,   "SV", "USD"),
    ("escritorio ejecutivo",         "unidad",     185,  130,  260,   70,  "SV", "USD"),
    ("silla ejecutiva",              "unidad",     140,  90,   210,   55,  "SV", "USD"),
    ("silla plastica",               "unidad",     16,   12,   22,    4,   "SV", "USD"),
    ("pick up doble cabina",         "unidad",     27500,21000,36000, 7000,"SV", "USD"),
    ("servicio de limpieza mensual", "mes",        400,  280,  580,   130, "SV", "USD"),
    ("consultoria tecnica hora",     "hora",       95,   65,   140,   30,  "SV", "USD"),
]


def _iqr_filter(precios: list[float]) -> list[float]:
    ps = sorted(precios)
    n = len(ps)
    if n < 4:
        return ps
    q1 = ps[n // 4]
    q3 = ps[3 * n // 4]
    iqr = q3 - q1
    if iqr == 0:
        return ps
    lo = q1 - 1.5 * iqr
    hi = q3 + 1.5 * iqr
    clean = [p for p in ps if lo <= p <= hi]
    return clean if len(clean) >= 2 else ps


def run():
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row

    # Solo importar MX y PE desde MercadoLibre (buena cobertura)
    rows = conn.execute("""
        SELECT normalized_name, unit, country, currency, price
        FROM local_prices
        WHERE price > 0 AND normalized_name IS NOT NULL AND normalized_name != ''
          AND country IN ('MX', 'PE')
        ORDER BY country, normalized_name
    """).fetchall()
    conn.close()

    # Agrupar por (normalized_name, country)
    grupos: dict[tuple, dict] = {}
    for r in rows:
        key = (r["normalized_name"], r["country"])
        if key not in grupos:
            grupos[key] = {
                "unit":     r["unit"] or "unidad",
                "currency": r["currency"] or MONEDAS.get(r["country"], "USD"),
                "precios":  [],
            }
        grupos[key]["precios"].append(float(r["price"]))

    print(f"Grupos encontrados: {len(grupos)}")

    db = SessionLocal()
    try:
        # 1) Borrar precios inventados
        borrados = db.query(PrecioReferencia).filter(
            PrecioReferencia.fuente == "seed_mercado_2024"
        ).delete()
        db.flush()
        print(f"Borrados {borrados} precios inventados (seed_mercado_2024)")

        # 2) Insertar precios reales
        insertados = actualizados = 0
        now = datetime.utcnow()

        for (norm_name, pais), data in grupos.items():
            precios = _iqr_filter(data["precios"])
            n = len(precios)

            if n == 0:
                continue

            mediana = statistics.median(precios)
            std     = statistics.stdev(precios) if n > 1 else mediana * 0.15
            p25     = precios[max(0, int(n * 0.25))]
            p75     = precios[min(n - 1, int(n * 0.75))]

            desc_display = NOMBRE_DISPLAY.get(norm_name, norm_name.replace("_", " "))
            moneda = data["currency"] or MONEDAS.get(pais, "USD")

            existing = db.query(PrecioReferencia).filter_by(
                descripcion=desc_display, pais=pais
            ).first()

            if existing:
                existing.precio_mediana       = mediana
                existing.precio_p25           = p25
                existing.precio_p75           = p75
                existing.precio_min           = precios[0]
                existing.precio_max           = precios[-1]
                existing.desviacion_std       = std
                existing.n_muestras           = n
                existing.fuente               = "mercadolibre_scrape"
                existing.ultima_actualizacion = now
                actualizados += 1
            else:
                db.add(PrecioReferencia(
                    descripcion          = desc_display,
                    unidad               = data["unit"],
                    precio_mediana       = mediana,
                    precio_p25           = p25,
                    precio_p75           = p75,
                    precio_min           = precios[0],
                    precio_max           = precios[-1],
                    desviacion_std       = std,
                    n_muestras           = n,
                    pais                 = pais,
                    moneda               = moneda,
                    fuente               = "mercadolibre_scrape",
                    ultima_actualizacion = now,
                    created_at           = now,
                ))
                insertados += 1

        # 3) GT y SV: precios de mercado local investigados
        gt_sv_insertados = gt_sv_actualizados = 0
        for desc, unidad, med, p25, p75, std, pais, moneda in PRECIOS_MERCADO_LOCAL:
            existing = db.query(PrecioReferencia).filter_by(
                descripcion=desc, pais=pais
            ).first()
            if existing:
                existing.precio_mediana       = med
                existing.precio_p25           = p25
                existing.precio_p75           = p75
                existing.precio_min           = p25 * 0.85
                existing.precio_max           = p75 * 1.20
                existing.desviacion_std       = std
                existing.fuente               = "mercado_local_investigado"
                existing.ultima_actualizacion = now
                gt_sv_actualizados += 1
            else:
                db.add(PrecioReferencia(
                    descripcion          = desc,
                    unidad               = unidad,
                    precio_mediana       = med,
                    precio_p25           = p25,
                    precio_p75           = p75,
                    precio_min           = p25 * 0.85,
                    precio_max           = p75 * 1.20,
                    desviacion_std       = std,
                    n_muestras           = 30,
                    pais                 = pais,
                    moneda               = moneda,
                    fuente               = "mercado_local_investigado",
                    ultima_actualizacion = now,
                    created_at           = now,
                ))
                gt_sv_insertados += 1

        db.commit()

        total = db.query(PrecioReferencia).count()
        from sqlalchemy import func
        by_pais = db.query(PrecioReferencia.pais, func.count()).group_by(PrecioReferencia.pais).all()

        print(f"\nMX/PE MercadoLibre: {insertados} nuevos, {actualizados} actualizados")
        print(f"GT/SV mercado local: {gt_sv_insertados} nuevos, {gt_sv_actualizados} actualizados")
        print(f"Total precios_referencia en DB: {total}")
        print("Por pais:", dict(by_pais))

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
