"""
Importa contratos reales desde el scraper SQLite hacia la DB de la app.

Fuentes:
  - SECOP / SECOP1 (Colombia): contratos con monto real en COP
  - IDB (BID): licitaciones para GT, MX, SV, PE y otros paises LatAm

Uso:
    python import_contratos_reales.py

El script:
  1. Borra todos los registros con fuente='seed_demo'
  2. Importa contratos reales evitando duplicados por ocid
  3. Crea registros de empresa para proveedores SECOP
"""
from __future__ import annotations
import sys, os, json, re
from datetime import date, datetime
from pathlib import Path

# --- Cargar .env manualmente ---
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
from models import ObraPublica, Empresa


# ── Límites por fuente ────────────────────────────────────────────────────────
SECOP_LIMIT  = 1000   # contratos Colombia con mayor valor
IDB_LIMIT    = 300    # por pais IDB
IDB_PAISES   = ["GT", "MX", "SV", "PE", "CO", "AR", "BO", "EC", "HN", "NI", "CR", "PA"]


def _parse_date(val: str | None) -> date | None:
    if not val:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(val[:len(fmt.replace("%Y", "0000").replace("%m", "00").replace("%d", "00").replace("%H", "00").replace("%M", "00").replace("%S", "00"))], fmt).date()
        except Exception:
            continue
    return None


def _parse_date_simple(val: str | None) -> date | None:
    if not val:
        return None
    val = str(val).strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(val[:19], fmt).date()
        except Exception:
            pass
    try:
        return datetime.strptime(val[:10], "%Y-%m-%d").date()
    except Exception:
        return None


def _clean_title(title: str | None) -> str:
    if not title:
        return ""
    title = title.strip()
    skip = {"Sin título", "Sin titulo", "No definido", "", "N/A"}
    if title in skip:
        return ""
    return title[:500]


def _get_or_create_empresa(db, nombre: str, pais: str) -> str | None:
    if not nombre or nombre.strip() == "":
        return None
    nombre = nombre.strip()[:200]
    existing = db.query(Empresa).filter(Empresa.nombre_canónico == nombre).first()
    if existing:
        return str(existing.id)
    emp = Empresa(
        nombre_canónico  = nombre,
        paises           = [pais],
        score_riesgo     = 0,
        total_contratos  = 0,
        total_adjudicado = 0,
        sobreprecio_prom = 0,
    )
    db.add(emp)
    db.flush()
    return str(emp.id)


def import_secop(db, conn_sqlite) -> int:
    cursor = conn_sqlite.cursor()
    cursor.execute("""
        SELECT id, title, authority, total_value, currency, country,
               source_url, source, award_date, raw_json
        FROM contracts
        WHERE source IN ('SECOP','SECOP1')
          AND total_value > 0
          AND title NOT IN ('', 'Sin titulo', 'No definido')
          AND title IS NOT NULL
        ORDER BY total_value DESC
        LIMIT ?
    """, (SECOP_LIMIT,))
    rows = cursor.fetchall()

    # OCID existentes para no duplicar
    existing_ocids = {
        r[0] for r in db.query(ObraPublica.ocid).filter(ObraPublica.ocid.isnot(None)).all()
    }

    insertados = 0
    for row in rows:
        ocid, title, authority, total_value, currency, country, \
            source_url, source, award_date, raw_json_str = row

        if ocid in existing_ocids:
            continue

        title_clean = _clean_title(title)
        if not title_clean:
            continue

        rj = {}
        if raw_json_str:
            try:
                rj = json.loads(raw_json_str)
            except Exception:
                pass

        proveedor   = rj.get("proveedor_adjudicado", "")
        categoria   = rj.get("tipo_de_contrato", "obra")
        empresa_id  = _get_or_create_empresa(db, proveedor, country or "CO")
        fecha       = _parse_date_simple(award_date)

        obra = ObraPublica(
            ocid               = ocid,
            titulo             = title_clean,
            descripcion        = rj.get("objeto_del_contrato") or title_clean,
            pais               = country or "CO",
            entidad_compradora = authority or rj.get("nombre_entidad"),
            empresa_id         = empresa_id,
            monto_adjudicado   = float(total_value),
            moneda             = currency or "COP",
            fecha_adjudicacion = fecha,
            categoria          = categoria,
            url_fuente         = source_url,
            fuente             = source or "SECOP",
            procesado          = True,
        )
        db.add(obra)
        existing_ocids.add(ocid)
        insertados += 1

        if insertados % 100 == 0:
            db.flush()
            print(f"  SECOP: {insertados} contratos insertados...")

    db.flush()
    return insertados


def import_idb(db, conn_sqlite) -> int:
    cursor = conn_sqlite.cursor()

    existing_ocids = {
        r[0] for r in db.query(ObraPublica.ocid).filter(ObraPublica.ocid.isnot(None)).all()
    }

    insertados = 0
    for pais in IDB_PAISES:
        cursor.execute("""
            SELECT id, title, authority, country, source_url, pdf_url, raw_json
            FROM contracts
            WHERE source = 'IDB'
              AND country = ?
              AND title IS NOT NULL
              AND title != ''
            LIMIT ?
        """, (pais, IDB_LIMIT))
        rows = cursor.fetchall()

        pais_count = 0
        for row in rows:
            ocid, title, authority, country, source_url, pdf_url, raw_json_str = row

            if ocid in existing_ocids:
                continue

            title_clean = _clean_title(title)
            if not title_clean:
                continue

            rj = {}
            if raw_json_str:
                try:
                    rj = json.loads(raw_json_str)
                except Exception:
                    pass

            pub_date  = rj.get("publicationdate") or rj.get("deadline")
            fecha     = _parse_date_simple(pub_date)
            sector    = rj.get("sector") or rj.get("category_nm") or ""
            categoria = None if sector == "NULL" or not sector else sector

            # Intentar extraer monto adjudicado del raw_json OCDS
            monto = None
            for campo in ("totalprojectcost", "totalamount", "amount", "contractamount", "awarded_amount"):
                val = rj.get(campo)
                if val and str(val).replace(".", "").isdigit():
                    try:
                        monto = float(val)
                        if monto > 0:
                            break
                    except (TypeError, ValueError):
                        pass

            # Intentar extraer empresa del raw_json
            empresa_nombre = rj.get("suppliername") or rj.get("vendor") or rj.get("contractor") or ""
            empresa_id = _get_or_create_empresa(db, empresa_nombre, country or pais) if empresa_nombre else None

            obra = ObraPublica(
                ocid               = ocid,
                titulo             = title_clean,
                descripcion        = rj.get("process_desc") or title_clean,
                pais               = country or pais,
                entidad_compradora = "BID / IDB",
                empresa_id         = empresa_id,
                monto_adjudicado   = monto,
                moneda             = "USD",
                fecha_adjudicacion = fecha,
                categoria          = categoria or "obra",
                url_fuente         = source_url or rj.get("documenturl"),
                pdf_url            = pdf_url or rj.get("documenturl"),
                fuente             = "IDB",
                procesado          = True,
            )
            db.add(obra)
            existing_ocids.add(ocid)
            insertados += 1
            pais_count += 1

        if pais_count:
            db.flush()
            print(f"  IDB {pais}: {pais_count} contratos insertados")

    return insertados


def run():
    import sqlite3

    print(f"Conectando a SQLite: {SQLITE_PATH}")
    conn_sqlite = sqlite3.connect(SQLITE_PATH)

    print("Conectando a PostgreSQL...")
    db = SessionLocal()

    try:
        # 1) Borrar seed inventados (fuente='seed_demo' y ocid con prefijo ocds-seed-)
        borrados = db.query(ObraPublica).filter(ObraPublica.fuente == "seed_demo").delete()
        borrados += db.query(ObraPublica).filter(ObraPublica.ocid.like("ocds-seed-%")).delete()
        db.flush()
        print(f"Borrados {borrados} contratos inventados")

        # 2) Importar SECOP
        print(f"\nImportando SECOP (máx {SECOP_LIMIT} contratos)...")
        n_secop = import_secop(db, conn_sqlite)
        print(f"SECOP: {n_secop} contratos importados")

        # 3) Importar IDB
        print(f"\nImportando IDB (máx {IDB_LIMIT} por país)...")
        n_idb = import_idb(db, conn_sqlite)
        print(f"IDB: {n_idb} contratos importados")

        db.commit()

        total = db.query(ObraPublica).count()
        print(f"\nListo. Total obras_publicas en DB: {total}")
        print(f"  SECOP: {n_secop} | IDB: {n_idb}")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()
        conn_sqlite.close()


if __name__ == "__main__":
    run()
