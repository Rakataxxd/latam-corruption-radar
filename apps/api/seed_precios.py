"""
Seed de precios de referencia para el demo.

Corre este script una vez para poblar la tabla precios_referencia
con precios de mercado reales para Guatemala, El Salvador, México y Perú.
Cubre construcción, equipo de oficina, mobiliario, vehículos y servicios.

Uso:
    python seed_precios.py
"""
from __future__ import annotations
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

# Cargar variables de entorno
from pathlib import Path
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

from database import SessionLocal
from models import PrecioReferencia
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────────────
# Estructura: (descripcion, unidad, mediana, p25, p75, std, pais, moneda)
# Precios investigados en mercados locales, 2024.
# ─────────────────────────────────────────────────────────────────────────────

ITEMS: list[tuple] = [

    # ── GUATEMALA (GTQ) ────────────────────────────────────────────────────
    # Construcción
    ("cemento portland",                "bolsa",      78,   70,   88,   9,    "GT", "GTQ"),
    ("arena de río",                    "m3",         260,  200,  320,  50,   "GT", "GTQ"),
    ("piedrín triturado",               "m3",         340,  270,  410,  60,   "GT", "GTQ"),
    ("block de concreto",               "unidad",     4.75, 4.10, 5.40, 0.55, "GT", "GTQ"),
    ("varilla corrugada 3/8",           "varilla",    105,  85,   130,  18,   "GT", "GTQ"),
    ("varilla corrugada 1/2",           "varilla",    205,  175,  240,  30,   "GT", "GTQ"),
    ("pintura látex",                   "galón",      195,  150,  250,  42,   "GT", "GTQ"),
    ("tablón de madera pino",           "unidad",     110,  85,   145,  25,   "GT", "GTQ"),
    ("tubo pvc 4 pulgadas",             "unidad",     160,  120,  205,  35,   "GT", "GTQ"),
    ("cable eléctrico thhn 12",         "rollo 100m", 690,  580,  820,  100,  "GT", "GTQ"),
    ("lámina de zinc",                  "unidad",     105,  82,   132,  22,   "GT", "GTQ"),
    ("cal hidratada",                   "bolsa",      32,   26,   40,   6,    "GT", "GTQ"),
    # Equipo de oficina
    ("computadora de escritorio",       "unidad",     5500, 4200, 7000, 1100, "GT", "GTQ"),
    ("laptop computadora portátil",     "unidad",     6000, 4500, 9000, 1800, "GT", "GTQ"),
    ("impresora multifuncional",        "unidad",     2500, 1800, 3800, 700,  "GT", "GTQ"),
    ("tóner hp cartucho",               "unidad",     490,  360,  620,  110,  "GT", "GTQ"),
    ("papel bond resma",                "resma",      88,   68,   112,  20,   "GT", "GTQ"),
    ("monitor 24 pulgadas",             "unidad",     2200, 1600, 3200, 600,  "GT", "GTQ"),
    ("ups no break",                    "unidad",     850,  620,  1200, 250,  "GT", "GTQ"),
    # Mobiliario
    ("escritorio ejecutivo",            "unidad",     1450, 1000, 2100, 480,  "GT", "GTQ"),
    ("silla ejecutiva",                 "unidad",     1050, 700,  1600, 380,  "GT", "GTQ"),
    ("silla plástica",                  "unidad",     145,  110,  200,  40,   "GT", "GTQ"),
    ("archivero metálico 4 gavetas",    "unidad",     2100, 1500, 2900, 570,  "GT", "GTQ"),
    ("aire acondicionado 12000 btu",    "unidad",     5600, 4400, 7200, 1200, "GT", "GTQ"),
    ("proyector",                       "unidad",     4700, 3500, 6400, 1200, "GT", "GTQ"),
    # Vehículos
    ("pick up doble cabina",            "unidad",     225000,180000,285000,45000,"GT","GTQ"),
    ("motocicleta",                     "unidad",     15500, 12000,21000, 4000, "GT", "GTQ"),
    # Servicios
    ("servicio de limpieza mensual",    "mes",        3500,  2500, 5000, 1100, "GT", "GTQ"),
    ("consultoría técnica hora",        "hora",       850,   600,  1200, 250,  "GT", "GTQ"),
    ("servicio de seguridad mensual",   "mes",        7000,  5000, 10000,2500, "GT", "GTQ"),

    # ── EL SALVADOR (USD) ──────────────────────────────────────────────────
    # Construcción
    ("cemento portland",                "bolsa",      9.50,  8.20, 11.00, 1.20, "SV", "USD"),
    ("arena de río",                    "m3",         28,    22,   36,    6,    "SV", "USD"),
    ("piedrín triturado",               "m3",         38,    30,   46,    8,    "SV", "USD"),
    ("block de concreto",               "unidad",     0.48,  0.40, 0.57,  0.08, "SV", "USD"),
    ("varilla corrugada 3/8",           "varilla",    12,    10,   15,    2,    "SV", "USD"),
    ("varilla corrugada 1/2",           "varilla",    22,    18,   27,    4,    "SV", "USD"),
    ("pintura látex",                   "galón",      22,    16,   29,    5,    "SV", "USD"),
    ("tablón de madera",                "unidad",     11.50,  8,   16,    3.5,  "SV", "USD"),
    ("tubo pvc 4 pulgadas",             "unidad",     18,    14,   23,    4,    "SV", "USD"),
    ("cable eléctrico thhn 12",         "rollo 100m", 80,    65,   96,    14,   "SV", "USD"),
    ("lámina de zinc",                  "unidad",     11.50,  9,   15,    2.5,  "SV", "USD"),
    # Equipo de oficina
    ("computadora de escritorio",       "unidad",     650,   500,  860,   145,  "SV", "USD"),
    ("laptop computadora portátil",     "unidad",     780,   560,  1250,  240,  "SV", "USD"),
    ("impresora multifuncional",        "unidad",     310,   200,  460,   95,   "SV", "USD"),
    ("tóner hp cartucho",               "unidad",     62,    45,   82,    16,   "SV", "USD"),
    ("papel bond resma",                "resma",      10,    8,    13,    2,    "SV", "USD"),
    ("monitor 24 pulgadas",             "unidad",     245,   180,  340,   70,   "SV", "USD"),
    # Mobiliario
    ("escritorio ejecutivo",            "unidad",     185,   130,  260,   70,   "SV", "USD"),
    ("silla ejecutiva",                 "unidad",     140,   90,   210,   55,   "SV", "USD"),
    ("silla plástica",                  "unidad",     16,    12,   22,    4,    "SV", "USD"),
    ("archivero metálico 4 gavetas",    "unidad",     240,   170,  330,   80,   "SV", "USD"),
    ("aire acondicionado 12000 btu",    "unidad",     590,   450,  780,   150,  "SV", "USD"),
    ("proyector",                       "unidad",     520,   380,  720,   150,  "SV", "USD"),
    # Vehículos
    ("pick up doble cabina",            "unidad",     27500, 21000,36000, 7000, "SV", "USD"),
    ("motocicleta",                     "unidad",     1800,  1300, 2600,  600,  "SV", "USD"),
    # Servicios
    ("servicio de limpieza mensual",    "mes",        400,   280,  580,   130,  "SV", "USD"),
    ("consultoría técnica hora",        "hora",       95,    65,   140,   30,   "SV", "USD"),

    # ── MEXICO (MXN) ────────────────────────────────────────────────────────
    # Construcción
    ("cemento portland",                "bolsa",      195,   170,  225,   25,   "MX", "MXN"),
    ("arena fina de río",               "m3",         880,   700,  1100,  180,  "MX", "MXN"),
    ("grava triturada",                 "m3",         1180,  900,  1500,  260,  "MX", "MXN"),
    ("block de concreto",               "unidad",     13,    10,   17,    3,    "MX", "MXN"),
    ("varilla corrugada 3/8",           "varilla",    120,   95,   150,   25,   "MX", "MXN"),
    ("varilla corrugada 1/2",           "varilla",    225,   180,  270,   45,   "MX", "MXN"),
    ("pintura vinílica",                "galón",      480,   380,  620,   110,  "MX", "MXN"),
    ("tablón de madera",                "unidad",     128,   95,   165,   35,   "MX", "MXN"),
    ("tubo pvc 4 pulgadas",             "unidad",     215,   160,  285,   60,   "MX", "MXN"),
    ("cable eléctrico thhn 12",         "rollo 100m", 920,   750,  1150,  190,  "MX", "MXN"),
    ("lámina galvanizada",              "lámina",     150,   115,  190,   38,   "MX", "MXN"),
    # Equipo de oficina
    ("computadora de escritorio",       "unidad",     15500, 12000,21000, 3800, "MX", "MXN"),
    ("laptop computadora portátil",     "unidad",     18000, 13000,26000, 5500, "MX", "MXN"),
    ("impresora multifuncional",        "unidad",     6200,  4400, 9500,  2100, "MX", "MXN"),
    ("tóner hp cartucho",               "unidad",     1200,  900,  1700,  380,  "MX", "MXN"),
    ("papel bond resma",                "resma",      225,   175,  285,   55,   "MX", "MXN"),
    ("monitor 24 pulgadas",             "unidad",     5500,  4000, 8000,  1800, "MX", "MXN"),
    ("ups no break",                    "unidad",     2400,  1700, 3500,  750,  "MX", "MXN"),
    # Mobiliario
    ("escritorio ejecutivo",            "unidad",     3900,  2800, 5600,  1200, "MX", "MXN"),
    ("silla ejecutiva",                 "unidad",     3200,  2200, 4700,  1000, "MX", "MXN"),
    ("silla plástica",                  "unidad",     380,   280,  520,   110,  "MX", "MXN"),
    ("archivero metálico 4 gavetas",    "unidad",     4700,  3500, 6500,  1400, "MX", "MXN"),
    ("aire acondicionado 12000 btu",    "unidad",     11800, 8500, 16000, 3500, "MX", "MXN"),
    ("proyector",                       "unidad",     10000, 7000, 15000, 3500, "MX", "MXN"),
    # Vehículos
    ("pick up doble cabina",            "unidad",     480000,380000,640000,130000,"MX","MXN"),
    ("motocicleta",                     "unidad",     42000, 32000,58000, 12000, "MX", "MXN"),
    # Servicios
    ("servicio de limpieza mensual",    "mes",        8500,  6000, 13000, 3000, "MX", "MXN"),
    ("consultoría técnica hora",        "hora",       1800,  1200, 2800,  700,  "MX", "MXN"),
    ("servicio de seguridad mensual",   "mes",        22000, 15000,35000, 9000, "MX", "MXN"),

    # ── PERU (PEN) ──────────────────────────────────────────────────────────
    # Construcción
    ("cemento portland",                "bolsa",      28,    24,   34,    4,    "PE", "PEN"),
    ("arena fina",                      "m3",         82,    65,   102,   18,   "PE", "PEN"),
    ("piedra chancada",                 "m3",         96,    75,   122,   22,   "PE", "PEN"),
    ("ladrillo king kong",              "millar",     850,   680,  1050,  200,  "PE", "PEN"),
    ("varilla corrugada 3/8",           "varilla",    48,    38,   60,    10,   "PE", "PEN"),
    ("varilla corrugada 1/2",           "varilla",    87,    70,   108,   18,   "PE", "PEN"),
    ("pintura látex",                   "galón",      72,    55,   92,    18,   "PE", "PEN"),
    ("tabla madera tornillo",           "unidad",     38,    28,   50,    12,   "PE", "PEN"),
    ("tubo pvc 4 pulgadas",             "unidad",     45,    35,   57,    11,   "PE", "PEN"),
    ("cable eléctrico thhn 12",         "rollo 100m", 285,   220,  360,   65,   "PE", "PEN"),
    ("calamina plancha zinc",           "plancha",    36,    28,   46,    9,    "PE", "PEN"),
    # Equipo de oficina
    ("computadora de escritorio",       "unidad",     2900,  2200, 4000,  800,  "PE", "PEN"),
    ("laptop computadora portátil",     "unidad",     3700,  2500, 5800,  1300, "PE", "PEN"),
    ("impresora multifuncional",        "unidad",     1350,  900,  2100,  500,  "PE", "PEN"),
    ("tóner hp cartucho",               "unidad",     250,   180,  340,   75,   "PE", "PEN"),
    ("papel bond resma",                "resma",      42,    32,   55,    12,   "PE", "PEN"),
    ("monitor 24 pulgadas",             "unidad",     1200,  880,  1700,  400,  "PE", "PEN"),
    # Mobiliario
    ("escritorio ejecutivo",            "unidad",     780,   550,  1150,  280,  "PE", "PEN"),
    ("silla ejecutiva",                 "unidad",     580,   380,  850,   220,  "PE", "PEN"),
    ("silla plástica",                  "unidad",     80,    58,   115,   30,   "PE", "PEN"),
    ("archivero metálico 4 gavetas",    "unidad",     920,   650,  1300,  320,  "PE", "PEN"),
    ("aire acondicionado 12000 btu",    "unidad",     2400,  1750, 3300,  700,  "PE", "PEN"),
    ("proyector",                       "unidad",     2100,  1500, 3100,  800,  "PE", "PEN"),
    # Vehículos
    ("pick up doble cabina",            "unidad",     110000,85000,148000,30000, "PE", "PEN"),
    ("motocicleta",                     "unidad",     8500,  6200, 12000, 2500, "PE", "PEN"),
    # Servicios
    ("servicio de limpieza mensual",    "mes",        2800,  1900, 4200,  1000, "PE", "PEN"),
    ("consultoría técnica hora",        "hora",       120,   80,   180,   45,   "PE", "PEN"),
    ("servicio de seguridad mensual",   "mes",        5500,  3800, 8500,  2200, "PE", "PEN"),
]


def seed(db: Session) -> int:
    inserted = 0
    now = datetime.utcnow()

    for desc, unidad, med, p25, p75, std, pais, moneda in ITEMS:
        exists = (
            db.query(PrecioReferencia)
            .filter_by(descripcion=desc, pais=pais)
            .first()
        )
        if exists:
            continue  # no sobreescribimos datos existentes

        db.add(PrecioReferencia(
            descripcion          = desc,
            unidad               = unidad,
            precio_mediana       = med,
            precio_p25           = p25,
            precio_p75           = p75,
            precio_min           = p25 * 0.85,
            precio_max           = p75 * 1.20,
            desviacion_std       = std,
            n_muestras           = 50,       # muestras estimadas de mercado
            pais                 = pais,
            moneda               = moneda,
            fuente               = "seed_mercado_2024",
            ultima_actualizacion = now,
            created_at           = now,
        ))
        inserted += 1

    db.commit()
    return inserted


if __name__ == "__main__":
    db = SessionLocal()
    try:
        n = seed(db)
        print(f"OK: {n} precios de referencia insertados")
        total = db.query(PrecioReferencia).count()
        print(f"Total en tabla: {total}")
    finally:
        db.close()
