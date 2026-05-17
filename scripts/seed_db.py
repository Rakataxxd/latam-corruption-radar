"""
Seed script: carga datos demo realistas en Supabase.
Corre con: python scripts/seed_db.py
"""
import sys, os
from pathlib import Path

ROOT = Path(__file__).parent.parent
for line in (ROOT / ".env").read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, str(ROOT / "apps" / "api"))

from database import SessionLocal, engine
from models import Base, Empresa, EmpresaPais, ObraPublica, PrecioReferencia
import uuid

Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Limpiando tablas...")
db.query(ObraPublica).delete()
db.query(EmpresaPais).delete()
db.query(Empresa).delete()
db.query(PrecioReferencia).delete()
db.commit()

# ── EMPRESAS ────────────────────────────────────────────────
empresas_data = [
    {"nombre": "Constructora Centroamérica S.A.", "paises": ["GT", "SV"], "nits": {"GT": "1234567-8", "SV": "0614-010101-123-4"}},
    {"nombre": "Grupo Constructor del Pacífico", "paises": ["GT", "MX"], "nits": {"GT": "9876543-2", "MX": "GCP851203AB1"}},
    {"nombre": "Infraestructura y Desarrollo S.A. de C.V.", "paises": ["MX"], "nits": {"MX": "IDC920401XY2"}},
    {"nombre": "Soluciones Viales Peruanas SAC", "paises": ["PE"], "nits": {"PE": "20501234567"}},
    {"nombre": "Tecnología y Sistemas GT", "paises": ["GT"], "nits": {"GT": "5555555-5"}},
    {"nombre": "Constructora Pacífico Norte S.A.", "paises": ["MX", "PE"], "nits": {"MX": "CPN010203QR4", "PE": "20609876543"}},
    {"nombre": "Servicios Integrados de El Salvador", "paises": ["SV"], "nits": {"SV": "0614-020202-456-7"}},
    {"nombre": "Obras Públicas del Sur S.A.", "paises": ["GT", "SV", "PE"], "nits": {"GT": "7777777-7", "SV": "0614-030303-789-0", "PE": "20412345678"}},
]

empresa_ids = {}
print("Insertando empresas...")
for e_data in empresas_data:
    emp = Empresa(
        id=str(uuid.uuid4()),
        nombre_canónico=e_data["nombre"],
        paises=e_data["paises"],
        score_riesgo=0,
        total_contratos=0,
        total_adjudicado=0,
        sobreprecio_prom=0,
    )
    db.add(emp)
    db.flush()
    empresa_ids[e_data["nombre"]] = emp.id

    for pais, nit in e_data["nits"].items():
        fuentes = {"GT": "GUATECOMPRAS", "SV": "COMPRASAL", "MX": "COMPRANET", "PE": "SEACE"}
        db.add(EmpresaPais(
            id=str(uuid.uuid4()),
            empresa_id=emp.id,
            pais=pais,
            nombre_local=e_data["nombre"],
            tax_id=nit,
            fuente=fuentes[pais],
        ))

db.commit()
print(f"  {len(empresa_ids)} empresas insertadas")

# ── OBRAS PÚBLICAS ────────────────────────────────────────────
obras_data = [
    # Guatemala — alto sobreprecio
    {"titulo": "Construcción de carretera CA-9 tramo norte, 45 km", "pais": "GT", "empresa": "Constructora Centroamérica S.A.", "monto": 48_500_000, "moneda": "GTQ", "entidad": "Ministerio de Comunicaciones Guatemala", "sp_pct": 285.4, "sp_score": 88},
    {"titulo": "Rehabilitación de puente sobre Río Motagua", "pais": "GT", "empresa": "Grupo Constructor del Pacífico", "monto": 12_300_000, "moneda": "GTQ", "entidad": "COVIAL Guatemala", "sp_pct": 142.1, "sp_score": 72},
    {"titulo": "Sistema de agua potable municipio San José", "pais": "GT", "empresa": "Obras Públicas del Sur S.A.", "monto": 3_200_000, "moneda": "GTQ", "entidad": "MSPAS Guatemala", "sp_pct": 67.3, "sp_score": 55},
    {"titulo": "Equipamiento informático Ministerio de Educación GT", "pais": "GT", "empresa": "Tecnología y Sistemas GT", "monto": 8_900_000, "moneda": "GTQ", "entidad": "MINEDUC Guatemala", "sp_pct": 312.8, "sp_score": 92},
    {"titulo": "Construcción edificio administrativo departamental", "pais": "GT", "empresa": "Constructora Centroamérica S.A.", "monto": 15_600_000, "moneda": "GTQ", "entidad": "Gobernación Quetzaltenango", "sp_pct": 189.5, "sp_score": 80},

    # El Salvador — varios niveles
    {"titulo": "Pavimentación calle principal cantón El Progreso", "pais": "SV", "empresa": "Servicios Integrados de El Salvador", "monto": 2_100_000, "moneda": "USD", "entidad": "MOP El Salvador", "sp_pct": 95.7, "sp_score": 65},
    {"titulo": "Suministro de medicamentos ISSS 2023", "pais": "SV", "empresa": "Constructora Centroamérica S.A.", "monto": 4_500_000, "moneda": "USD", "entidad": "ISSS El Salvador", "sp_pct": 234.2, "sp_score": 85},
    {"titulo": "Construcción de escuela en Usulután", "pais": "SV", "empresa": "Obras Públicas del Sur S.A.", "monto": 980_000, "moneda": "USD", "entidad": "MINED El Salvador", "sp_pct": 22.1, "sp_score": 25},
    {"titulo": "Reparación de red de alcantarillado San Salvador", "pais": "SV", "empresa": "Servicios Integrados de El Salvador", "monto": 3_300_000, "moneda": "USD", "entidad": "ANDA El Salvador", "sp_pct": 178.9, "sp_score": 79},

    # México — gran escala
    {"titulo": "Construcción tramo carretero Oaxaca-Puebla 120 km", "pais": "MX", "empresa": "Infraestructura y Desarrollo S.A. de C.V.", "monto": 890_000_000, "moneda": "MXN", "entidad": "SCT México", "sp_pct": 156.3, "sp_score": 75},
    {"titulo": "Adquisición de ambulancias IMSS Jalisco", "pais": "MX", "empresa": "Grupo Constructor del Pacífico", "monto": 45_000_000, "moneda": "MXN", "entidad": "IMSS Guadalajara", "sp_pct": 267.8, "sp_score": 87},
    {"titulo": "Equipamiento hospitalario ISSSTE Monterrey", "pais": "MX", "empresa": "Constructora Pacífico Norte S.A.", "monto": 120_000_000, "moneda": "MXN", "entidad": "ISSSTE Nuevo León", "sp_pct": 198.4, "sp_score": 82},
    {"titulo": "Sistema de videovigilancia Ciudad de México", "pais": "MX", "empresa": "Infraestructura y Desarrollo S.A. de C.V.", "monto": 230_000_000, "moneda": "MXN", "entidad": "SSC CDMX", "sp_pct": 341.2, "sp_score": 94},
    {"titulo": "Rehabilitación de escuelas públicas Veracruz", "pais": "MX", "empresa": "Constructora Pacífico Norte S.A.", "monto": 67_000_000, "moneda": "MXN", "entidad": "SEP Veracruz", "sp_pct": 18.5, "sp_score": 18},

    # Perú — varios
    {"titulo": "Construcción de hospital regional Arequipa", "pais": "PE", "empresa": "Soluciones Viales Peruanas SAC", "monto": 85_000_000, "moneda": "PEN", "entidad": "GORE Arequipa", "sp_pct": 127.6, "sp_score": 70},
    {"titulo": "Carretera Cusco-Puno tramo 2, 80 km", "pais": "PE", "empresa": "Constructora Pacífico Norte S.A.", "monto": 210_000_000, "moneda": "PEN", "entidad": "MTC Perú", "sp_pct": 213.7, "sp_score": 84},
    {"titulo": "Suministro de laptops para programa Cuna Más", "pais": "PE", "empresa": "Soluciones Viales Peruanas SAC", "monto": 12_500_000, "moneda": "PEN", "entidad": "MIDIS Perú", "sp_pct": 289.3, "sp_score": 89},
    {"titulo": "Mantenimiento de parques Lima Metropolitana", "pais": "PE", "empresa": "Obras Públicas del Sur S.A.", "monto": 4_200_000, "moneda": "PEN", "entidad": "MML Lima", "sp_pct": 34.2, "sp_score": 30},
]

print("Insertando obras públicas...")
from datetime import date, timedelta
import random
random.seed(42)

for i, o in enumerate(obras_data):
    emp_id = empresa_ids.get(o["empresa"])
    fecha = date(2023, 1, 1) + timedelta(days=random.randint(0, 700))
    obra = ObraPublica(
        id=str(uuid.uuid4()),
        ocid=f"ocds-seed-{o['pais'].lower()}-{i+1:04d}",
        titulo=o["titulo"],
        pais=o["pais"],
        entidad_compradora=o["entidad"],
        empresa_id=emp_id,
        monto_adjudicado=o["monto"],
        moneda=o["moneda"],
        fecha_adjudicacion=fecha,
        sobreprecio_score=o["sp_score"],
        sobreprecio_pct=o["sp_pct"],
        fuente={"GT":"GUATECOMPRAS","SV":"COMPRASAL","MX":"COMPRANET","PE":"SEACE"}[o["pais"]],
        procesado=True,
    )
    db.add(obra)

db.commit()
print(f"  {len(obras_data)} obras insertadas")

# ── PRECIOS DE REFERENCIA ─────────────────────────────────────
precios_data = [
    # Construcción
    {"desc": "Construcción de carretera asfaltada por kilómetro",  "mediana": 450_000, "p25": 380_000, "p75": 560_000, "std": 95_000, "n": 87, "moneda": "USD"},
    {"desc": "Pavimentación con concreto hidráulico m2",           "mediana": 85,      "p25": 70,      "p75": 105,     "std": 18,     "n": 234, "moneda": "USD"},
    {"desc": "Construcción de puente vehicular metro lineal",      "mediana": 25_000,  "p25": 18_000,  "p75": 34_000,  "std": 7_000,  "n": 45, "moneda": "USD"},
    {"desc": "Edificio administrativo m2 construido",              "mediana": 650,     "p25": 520,     "p75": 820,     "std": 140,    "n": 123, "moneda": "USD"},
    {"desc": "Instalación eléctrica residencial m2",               "mediana": 35,      "p25": 28,      "p75": 45,      "std": 9,      "n": 312, "moneda": "USD"},
    {"desc": "Sistema de agua potable por vivienda",               "mediana": 1_200,   "p25": 950,     "p75": 1_550,   "std": 280,    "n": 78, "moneda": "USD"},
    {"desc": "Rehabilitación de carretera km",                     "mediana": 120_000, "p25": 90_000,  "p75": 160_000, "std": 35_000, "n": 156, "moneda": "USD"},
    # Tecnología
    {"desc": "Laptop computadora portátil unidad",                 "mediana": 650,     "p25": 520,     "p75": 850,     "std": 150,    "n": 567, "moneda": "USD"},
    {"desc": "Servidor rack unidad",                               "mediana": 4_500,   "p25": 3_200,   "p75": 6_800,   "std": 1_200,  "n": 89, "moneda": "USD"},
    {"desc": "Cámara videovigilancia IP exterior unidad",          "mediana": 280,     "p25": 190,     "p75": 420,     "std": 95,     "n": 234, "moneda": "USD"},
    {"desc": "Software licencia sistema gestión unidad",           "mediana": 1_800,   "p25": 900,     "p75": 3_500,   "std": 850,    "n": 145, "moneda": "USD"},
    # Salud
    {"desc": "Ambulancia equipada unidad",                         "mediana": 45_000,  "p25": 38_000,  "p75": 58_000,  "std": 9_500,  "n": 67, "moneda": "USD"},
    {"desc": "Cama hospitalaria eléctrica unidad",                 "mediana": 2_200,   "p25": 1_700,   "p75": 2_900,   "std": 450,    "n": 189, "moneda": "USD"},
    {"desc": "Medicamento paracetamol 500mg blister",              "mediana": 0.08,    "p25": 0.06,    "p75": 0.11,    "std": 0.02,   "n": 890, "moneda": "USD"},
    {"desc": "Equipo de rayos X digital unidad",                   "mediana": 85_000,  "p25": 65_000,  "p75": 115_000, "std": 22_000, "n": 34, "moneda": "USD"},
    # Mobiliario
    {"desc": "Escritorio metálico oficina unidad",                 "mediana": 180,     "p25": 130,     "p75": 250,     "std": 55,     "n": 456, "moneda": "USD"},
    {"desc": "Silla ergonómica unidad",                            "mediana": 95,      "p25": 70,      "p75": 135,     "std": 28,     "n": 678, "moneda": "USD"},
    {"desc": "Aire acondicionado 12000 BTU unidad",                "mediana": 750,     "p25": 580,     "p75": 980,     "std": 180,    "n": 345, "moneda": "USD"},
]

print("Insertando precios de referencia...")
for p in precios_data:
    db.add(PrecioReferencia(
        id=str(uuid.uuid4()),
        descripcion=p["desc"],
        precio_mediana=p["mediana"],
        precio_p25=p["p25"],
        precio_p75=p["p75"],
        desviacion_std=p["std"],
        n_muestras=p["n"],
        moneda=p["moneda"],
        fuente="OCDS_HISTORICO",
    ))

db.commit()
print(f"  {len(precios_data)} precios de referencia insertados")

# ── ACTUALIZAR STATS DE EMPRESAS ──────────────────────────────
print("Actualizando stats de empresas...")
from sqlalchemy import func
for emp_nombre, emp_id in empresa_ids.items():
    obras = db.query(ObraPublica).filter_by(empresa_id=emp_id).all()
    if obras:
        total_adj = sum(float(o.monto_adjudicado or 0) for o in obras)
        avg_sp    = sum(float(o.sobreprecio_pct or 0) for o in obras) / len(obras)
        avg_score = sum(float(o.sobreprecio_score or 0) for o in obras) / len(obras)
        emp = db.query(Empresa).filter_by(id=emp_id).first()
        if emp:
            emp.total_contratos  = len(obras)
            emp.total_adjudicado = total_adj
            emp.sobreprecio_prom = avg_sp
            emp.score_riesgo     = avg_score
db.commit()

db.close()
print("\n✅ Seed completado.")
print(f"   {len(empresa_ids)} empresas")
print(f"   {len(obras_data)} obras")
print(f"   {len(precios_data)} precios de referencia")
