"""
Seed de obras_publicas con items detallados.

Genera contratos gubernamentales realistas con precios de mercado
para que el sistema pueda mostrar contratos de referencia en los analisis.
Mezcla precios normales e inflados para demostrar la deteccion.

Uso:
    python seed_obras.py
"""
from __future__ import annotations
import sys, os, uuid
from datetime import date, datetime
sys.path.insert(0, os.path.dirname(__file__))

from pathlib import Path
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

from database import SessionLocal
from models import ObraPublica, Empresa, EmpresaPais

MONEDAS = {"GT": "GTQ", "SV": "USD", "MX": "MXN", "PE": "PEN"}

PORTALES = {
    "GT": "https://www.guatecompras.gt/concursos/listadoConcursos.aspx",
    "SV": "https://www.comprasal.gob.sv/comprasal_web/busquedaPublica.jsf",
    "MX": "https://compranet.hacienda.gob.mx/esop/guest/go/public/opportunity/current",
    "PE": "https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml",
}

EMPRESAS_SEED = [
    {"nombre": "Constructora Centroamericana S.A.",     "paises": ["GT","SV"], "score": 72},
    {"nombre": "Tecnología Gubernamental S.A. de C.V.", "paises": ["MX"],      "score": 88},
    {"nombre": "Soluciones Integrales del Pacífico SAC","paises": ["PE"],       "score": 55},
    {"nombre": "Suministros del Estado S.A.",           "paises": ["GT"],       "score": 81},
    {"nombre": "Grupo Constructor del Norte S.A.",      "paises": ["MX"],       "score": 43},
    {"nombre": "Infraestructura y Obras Cívicas Ltda.", "paises": ["SV","GT"],  "score": 65},
    {"nombre": "Servicios Públicos Peruanos S.A.C.",    "paises": ["PE"],       "score": 70},
]

# ── Obras con items ───────────────────────────────────────────────────────────
# Formato items: {descripcion, cantidad, unidad, precio_unitario}
# precio_unitario: algunos inflados vs precios de referencia (seed_precios.py)

OBRAS_SEED = [

  # ── GUATEMALA ──────────────────────────────────────────────────────────────
  {
    "titulo":       "Compra de materiales de construccion para 15 escuelas municipales",
    "pais":         "GT",
    "entidad":      "Ministerio de Educacion - MINEDUC",
    "empresa_idx":  0,
    "monto":        285000,
    "fecha":        date(2024, 2, 14),
    "score":        18,
    "items": [
      {"descripcion": "cemento portland",       "cantidad": 800,  "unidad": "bolsa",   "precio_unitario": 80},
      {"descripcion": "arena de rio",           "cantidad": 150,  "unidad": "m3",      "precio_unitario": 265},
      {"descripcion": "varilla corrugada 3/8",  "cantidad": 500,  "unidad": "varilla", "precio_unitario": 108},
      {"descripcion": "block de concreto",      "cantidad": 8000, "unidad": "unidad",  "precio_unitario": 4.90},
      {"descripcion": "cal hidratada",          "cantidad": 200,  "unidad": "bolsa",   "precio_unitario": 34},
    ]
  },
  {
    "titulo":       "Equipamiento informatico para oficinas de la gobernacion 2024",
    "pais":         "GT",
    "entidad":      "Gobernacion Departamental de Guatemala",
    "empresa_idx":  3,
    "monto":        390000,
    "fecha":        date(2024, 3, 8),
    "score":        91,
    "items": [
      {"descripcion": "laptop computadora portatil",  "cantidad": 20, "unidad": "unidad", "precio_unitario": 12500},
      {"descripcion": "impresora multifuncional",      "cantidad": 10, "unidad": "unidad", "precio_unitario": 5800},
      {"descripcion": "monitor 24 pulgadas",           "cantidad": 20, "unidad": "unidad", "precio_unitario": 4900},
      {"descripcion": "ups no break",                  "cantidad": 15, "unidad": "unidad", "precio_unitario": 1950},
      {"descripcion": "papel bond resma",              "cantidad": 100,"unidad": "resma",  "precio_unitario": 195},
    ]
  },
  {
    "titulo":       "Remodelacion del palacio municipal de Mixco",
    "pais":         "GT",
    "entidad":      "Municipalidad de Mixco",
    "empresa_idx":  0,
    "monto":        145000,
    "fecha":        date(2023, 11, 20),
    "score":        52,
    "items": [
      {"descripcion": "cemento portland",      "cantidad": 400,  "unidad": "bolsa",   "precio_unitario": 82},
      {"descripcion": "pintura latex",         "cantidad": 120,  "unidad": "galon",   "precio_unitario": 340},
      {"descripcion": "varilla corrugada 1/2", "cantidad": 200,  "unidad": "varilla", "precio_unitario": 208},
      {"descripcion": "lamina de zinc",        "cantidad": 300,  "unidad": "unidad",  "precio_unitario": 220},
      {"descripcion": "tubo pvc 4 pulgadas",   "cantidad": 150,  "unidad": "unidad",  "precio_unitario": 163},
    ]
  },
  {
    "titulo":       "Adquisicion de mobiliario para ministerios zona central",
    "pais":         "GT",
    "entidad":      "Ministerio de Finanzas Publicas",
    "empresa_idx":  3,
    "monto":        320000,
    "fecha":        date(2024, 1, 15),
    "score":        87,
    "items": [
      {"descripcion": "escritorio ejecutivo",         "cantidad": 50, "unidad": "unidad", "precio_unitario": 3200},
      {"descripcion": "silla ejecutiva",              "cantidad": 80, "unidad": "unidad", "precio_unitario": 2400},
      {"descripcion": "archivero metalico 4 gavetas", "cantidad": 25, "unidad": "unidad", "precio_unitario": 4500},
      {"descripcion": "silla plastica",               "cantidad": 200,"unidad": "unidad", "precio_unitario": 280},
    ]
  },
  {
    "titulo":       "Suministro de materiales electricos para alumbrado urbano",
    "pais":         "GT",
    "entidad":      "Empresa Municipal de Electricidad EEGSA",
    "empresa_idx":  0,
    "monto":        98000,
    "fecha":        date(2024, 4, 3),
    "score":        22,
    "items": [
      {"descripcion": "cable electrico thhn 12",  "cantidad": 80, "unidad": "rollo 100m", "precio_unitario": 710},
      {"descripcion": "tubo pvc 4 pulgadas",       "cantidad": 200,"unidad": "unidad",    "precio_unitario": 165},
      {"descripcion": "piedrín triturado",         "cantidad": 40, "unidad": "m3",        "precio_unitario": 355},
    ]
  },

  # ── EL SALVADOR ────────────────────────────────────────────────────────────
  {
    "titulo":       "Construccion de modulos escolares en municipios rurales MINED",
    "pais":         "SV",
    "entidad":      "Ministerio de Educacion El Salvador",
    "empresa_idx":  5,
    "monto":        185000,
    "fecha":        date(2024, 2, 28),
    "score":        15,
    "items": [
      {"descripcion": "cemento portland",       "cantidad": 600, "unidad": "bolsa",   "precio_unitario": 9.80},
      {"descripcion": "arena de rio",           "cantidad": 80,  "unidad": "m3",      "precio_unitario": 29},
      {"descripcion": "varilla corrugada 3/8",  "cantidad": 400, "unidad": "varilla", "precio_unitario": 12.50},
      {"descripcion": "block de concreto",      "cantidad": 5000,"unidad": "unidad",  "precio_unitario": 0.50},
      {"descripcion": "tabla madera",           "cantidad": 300, "unidad": "unidad",  "precio_unitario": 12},
    ]
  },
  {
    "titulo":       "Adquisicion de equipos informaticos MINSAL hospitales 2024",
    "pais":         "SV",
    "entidad":      "Ministerio de Salud El Salvador",
    "empresa_idx":  5,
    "monto":        125000,
    "fecha":        date(2024, 3, 22),
    "score":        92,
    "items": [
      {"descripcion": "computadora de escritorio",  "cantidad": 50, "unidad": "unidad", "precio_unitario": 1420},
      {"descripcion": "impresora multifuncional",    "cantidad": 25, "unidad": "unidad", "precio_unitario": 680},
      {"descripcion": "monitor 24 pulgadas",         "cantidad": 50, "unidad": "unidad", "precio_unitario": 520},
      {"descripcion": "ups no break",                "cantidad": 30, "unidad": "unidad", "precio_unitario": 380},
    ]
  },
  {
    "titulo":       "Compra de mobiliario para juzgados de paz departamentales",
    "pais":         "SV",
    "entidad":      "Organo Judicial El Salvador",
    "empresa_idx":  5,
    "monto":        68000,
    "fecha":        date(2023, 10, 5),
    "score":        61,
    "items": [
      {"descripcion": "escritorio ejecutivo",         "cantidad": 40, "unidad": "unidad", "precio_unitario": 195},
      {"descripcion": "silla ejecutiva",              "cantidad": 40, "unidad": "unidad", "precio_unitario": 295},
      {"descripcion": "archivero metalico 4 gavetas", "cantidad": 20, "unidad": "unidad", "precio_unitario": 255},
      {"descripcion": "silla plastica",               "cantidad": 150,"unidad": "unidad", "precio_unitario": 18},
    ]
  },
  {
    "titulo":       "Remodelacion y pintura de instalaciones ANDA",
    "pais":         "SV",
    "entidad":      "Administracion Nacional de Acueductos ANDA",
    "empresa_idx":  0,
    "monto":        42000,
    "fecha":        date(2024, 1, 30),
    "score":        20,
    "items": [
      {"descripcion": "pintura latex",        "cantidad": 200,  "unidad": "galon",   "precio_unitario": 23},
      {"descripcion": "cemento portland",     "cantidad": 150,  "unidad": "bolsa",   "precio_unitario": 9.90},
      {"descripcion": "lamina de zinc",       "cantidad": 200,  "unidad": "unidad",  "precio_unitario": 12},
      {"descripcion": "tubo pvc 4 pulgadas",  "cantidad": 100,  "unidad": "unidad",  "precio_unitario": 19},
    ]
  },

  # ── MEXICO ─────────────────────────────────────────────────────────────────
  {
    "titulo":       "Adquisicion de equipos de computo para aulas digitales SEP",
    "pais":         "MX",
    "entidad":      "Secretaria de Educacion Publica",
    "empresa_idx":  1,
    "monto":        4200000,
    "fecha":        date(2024, 4, 1),
    "score":        24,
    "items": [
      {"descripcion": "laptop computadora portatil", "cantidad": 100, "unidad": "unidad", "precio_unitario": 19500},
      {"descripcion": "proyector",                    "cantidad": 50,  "unidad": "unidad", "precio_unitario": 10800},
      {"descripcion": "monitor 24 pulgadas",          "cantidad": 100, "unidad": "unidad", "precio_unitario": 5800},
      {"descripcion": "ups no break",                 "cantidad": 80,  "unidad": "unidad", "precio_unitario": 2600},
    ]
  },
  {
    "titulo":       "Adquisicion de equipos de computo SSC CDMX 2024",
    "pais":         "MX",
    "entidad":      "Secretaria de Seguridad Ciudadana CDMX",
    "empresa_idx":  1,
    "monto":        8500000,
    "fecha":        date(2024, 3, 8),
    "score":        94,
    "items": [
      {"descripcion": "laptop computadora portatil", "cantidad": 200, "unidad": "unidad", "precio_unitario": 38000},
      {"descripcion": "impresora multifuncional",     "cantidad": 50,  "unidad": "unidad", "precio_unitario": 18500},
      {"descripcion": "ups no break",                 "cantidad": 150, "unidad": "unidad", "precio_unitario": 7200},
      {"descripcion": "toner hp cartucho",            "cantidad": 500, "unidad": "unidad", "precio_unitario": 3800},
    ]
  },
  {
    "titulo":       "Construccion de camino rural pavimentado Oaxaca",
    "pais":         "MX",
    "entidad":      "Secretaria de Comunicaciones y Transportes Oaxaca",
    "empresa_idx":  4,
    "monto":        2800000,
    "fecha":        date(2023, 9, 15),
    "score":        19,
    "items": [
      {"descripcion": "cemento portland",      "cantidad": 2000, "unidad": "bolsa",   "precio_unitario": 198},
      {"descripcion": "arena fina de rio",     "cantidad": 500,  "unidad": "m3",      "precio_unitario": 895},
      {"descripcion": "grava triturada",       "cantidad": 600,  "unidad": "m3",      "precio_unitario": 1200},
      {"descripcion": "varilla corrugada 3/8", "cantidad": 1500, "unidad": "varilla", "precio_unitario": 122},
      {"descripcion": "tabla de madera",       "cantidad": 800,  "unidad": "unidad",  "precio_unitario": 132},
    ]
  },
  {
    "titulo":       "Servicios de limpieza y mantenimiento IMSS region norte",
    "pais":         "MX",
    "entidad":      "Instituto Mexicano del Seguro Social IMSS",
    "empresa_idx":  4,
    "monto":        3600000,
    "fecha":        date(2024, 1, 10),
    "score":        89,
    "items": [
      {"descripcion": "servicio de limpieza mensual",  "cantidad": 12, "unidad": "mes",  "precio_unitario": 32000},
      {"descripcion": "servicio de seguridad mensual", "cantidad": 12, "unidad": "mes",  "precio_unitario": 85000},
      {"descripcion": "consultoria tecnica hora",      "cantidad": 500,"unidad": "hora", "precio_unitario": 5500},
    ]
  },
  {
    "titulo":       "Adquisicion de mobiliario para nuevas oficinas IMPI",
    "pais":         "MX",
    "entidad":      "Instituto Mexicano de la Propiedad Industrial",
    "empresa_idx":  1,
    "monto":        1450000,
    "fecha":        date(2024, 2, 20),
    "score":        78,
    "items": [
      {"descripcion": "escritorio ejecutivo",         "cantidad": 80, "unidad": "unidad", "precio_unitario": 8500},
      {"descripcion": "silla ejecutiva",              "cantidad": 120,"unidad": "unidad", "precio_unitario": 7200},
      {"descripcion": "archivero metalico 4 gavetas", "cantidad": 40, "unidad": "unidad", "precio_unitario": 9800},
      {"descripcion": "aire acondicionado 12000 btu", "cantidad": 20, "unidad": "unidad", "precio_unitario": 28000},
    ]
  },

  # ── PERU ────────────────────────────────────────────────────────────────────
  {
    "titulo":       "Construccion de infraestructura educativa en region Cusco",
    "pais":         "PE",
    "entidad":      "Gobierno Regional Cusco - MINEDU",
    "empresa_idx":  2,
    "monto":        485000,
    "fecha":        date(2024, 2, 5),
    "score":        16,
    "items": [
      {"descripcion": "cemento portland",       "cantidad": 1200, "unidad": "bolsa",   "precio_unitario": 29},
      {"descripcion": "arena fina",             "cantidad": 200,  "unidad": "m3",      "precio_unitario": 84},
      {"descripcion": "piedra chancada",        "cantidad": 180,  "unidad": "m3",      "precio_unitario": 98},
      {"descripcion": "ladrillo king kong",     "cantidad": 5,    "unidad": "millar",  "precio_unitario": 880},
      {"descripcion": "varilla corrugada 3/8",  "cantidad": 800,  "unidad": "varilla", "precio_unitario": 49},
      {"descripcion": "varilla corrugada 1/2",  "cantidad": 400,  "unidad": "varilla", "precio_unitario": 89},
    ]
  },
  {
    "titulo":       "Adquisicion de equipos informaticos para MINEDU instituciones",
    "pais":         "PE",
    "entidad":      "Ministerio de Educacion Peru",
    "empresa_idx":  6,
    "monto":        980000,
    "fecha":        date(2024, 3, 18),
    "score":        82,
    "items": [
      {"descripcion": "laptop computadora portatil", "cantidad": 100, "unidad": "unidad", "precio_unitario": 6800},
      {"descripcion": "computadora de escritorio",    "cantidad": 50,  "unidad": "unidad", "precio_unitario": 5200},
      {"descripcion": "impresora multifuncional",     "cantidad": 40,  "unidad": "unidad", "precio_unitario": 2900},
      {"descripcion": "toner hp cartucho",            "cantidad": 200, "unidad": "unidad", "precio_unitario": 520},
    ]
  },
  {
    "titulo":       "Mobiliario y equipamiento para centros de salud MINSA",
    "pais":         "PE",
    "entidad":      "Ministerio de Salud Peru MINSA",
    "empresa_idx":  6,
    "monto":        320000,
    "fecha":        date(2023, 12, 12),
    "score":        68,
    "items": [
      {"descripcion": "escritorio ejecutivo",         "cantidad": 60, "unidad": "unidad", "precio_unitario": 820},
      {"descripcion": "silla ejecutiva",              "cantidad": 80, "unidad": "unidad", "precio_unitario": 1100},
      {"descripcion": "silla plastica",               "cantidad": 300,"unidad": "unidad", "precio_unitario": 155},
      {"descripcion": "archivero metalico 4 gavetas", "cantidad": 30, "unidad": "unidad", "precio_unitario": 980},
    ]
  },
  {
    "titulo":       "Mantenimiento y servicios generales sede central OSINERGMIN",
    "pais":         "PE",
    "entidad":      "Organismo Supervisor de Inversion en Energia OSINERGMIN",
    "empresa_idx":  2,
    "monto":        210000,
    "fecha":        date(2024, 1, 22),
    "score":        35,
    "items": [
      {"descripcion": "servicio de limpieza mensual", "cantidad": 12, "unidad": "mes",  "precio_unitario": 3200},
      {"descripcion": "consultoria tecnica hora",     "cantidad": 200,"unidad": "hora", "precio_unitario": 135},
      {"descripcion": "papel bond resma",             "cantidad": 500,"unidad": "resma","precio_unitario": 44},
      {"descripcion": "toner hp cartucho",            "cantidad": 80, "unidad": "unidad","precio_unitario": 265},
    ]
  },
]


def seed(db: Session) -> dict:
    # 1) Crear empresas si no existen
    empresa_ids: list[str] = []
    for e in EMPRESAS_SEED:
        existing = db.query(Empresa).filter(
            Empresa.nombre_canónico == e["nombre"]
        ).first()
        if existing:
            empresa_ids.append(str(existing.id))
        else:
            emp = Empresa(
                nombre_canónico  = e["nombre"],
                paises           = e["paises"],
                score_riesgo     = e["score"],
                total_contratos  = 0,
                total_adjudicado = 0,
                sobreprecio_prom = 0,
            )
            db.add(emp)
            db.flush()
            empresa_ids.append(str(emp.id))

    # 2) Crear obras con items
    obras_creadas = 0
    for o in OBRAS_SEED:
        # Evitar duplicados por titulo+pais
        exists = db.query(ObraPublica).filter(
            ObraPublica.titulo == o["titulo"],
            ObraPublica.pais   == o["pais"],
        ).first()
        if exists:
            # Actualizar items si no tiene
            if not exists.items:
                exists.items = o["items"]
                db.flush()
            continue

        emp_idx = o.get("empresa_idx", 0)
        emp_id  = empresa_ids[emp_idx] if emp_idx < len(empresa_ids) else None
        moneda  = MONEDAS.get(o["pais"], "USD")

        obra = ObraPublica(
            titulo              = o["titulo"],
            pais                = o["pais"],
            entidad_compradora  = o["entidad"],
            empresa_id          = emp_id,
            monto_adjudicado    = o["monto"],
            moneda              = moneda,
            fecha_adjudicacion  = o["fecha"],
            items               = o["items"],
            sobreprecio_score   = o["score"],
            sobreprecio_pct     = o["score"] * 2.5,  # aproximado
            fuente              = "seed_demo",
            url_fuente          = PORTALES.get(o["pais"]),
            procesado           = True,
        )
        db.add(obra)
        obras_creadas += 1

    db.commit()

    total = db.query(ObraPublica).count()
    return {"obras_creadas": obras_creadas, "total_obras": total}


if __name__ == "__main__":
    db = SessionLocal()
    try:
        r = seed(db)
        print(f"OK: {r['obras_creadas']} obras creadas | Total: {r['total_obras']}")
    finally:
        db.close()
