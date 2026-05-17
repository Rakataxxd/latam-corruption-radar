from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from models import ObraPublica, Empresa, EmpresaPais, Cotizacion, ScrapingLog
from datetime import datetime


def get_cotizacion_by_hash(db: Session, hash_archivo: str):
    return db.query(Cotizacion).filter_by(hash_archivo=hash_archivo).first()


def create_cotizacion(db: Session, **kwargs) -> Cotizacion:
    cot = Cotizacion(**kwargs)
    db.add(cot)
    db.commit()
    db.refresh(cot)
    return cot


def list_obras(
    db: Session,
    pais=None, categoria=None, min_score=0,
    page=1, page_size=20, order_by="sobreprecio_score"
):
    q = db.query(ObraPublica)
    if pais:
        q = q.filter(ObraPublica.pais == pais.upper())
    if categoria:
        q = q.filter(ObraPublica.categoria.ilike(f"%{categoria}%"))
    if min_score:
        q = q.filter(ObraPublica.sobreprecio_score >= min_score)

    total = q.count()
    items = (
        q.order_by(desc(getattr(ObraPublica, order_by, ObraPublica.sobreprecio_score)))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    result = []
    for obra in items:
        empresa_nombre = None
        if obra.empresa_id:
            emp = db.query(Empresa).filter_by(id=obra.empresa_id).first()
            if emp:
                empresa_nombre = emp.nombre_canónico
        result.append({
            "id": obra.id,
            "titulo": obra.titulo,
            "pais": obra.pais,
            "entidad_compradora": obra.entidad_compradora,
            "empresa_nombre": empresa_nombre,
            "empresa_id": obra.empresa_id,
            "monto_adjudicado": float(obra.monto_adjudicado) if obra.monto_adjudicado else None,
            "moneda": obra.moneda,
            "fecha_adjudicacion": obra.fecha_adjudicacion,
            "sobreprecio_score": float(obra.sobreprecio_score) if obra.sobreprecio_score else None,
            "sobreprecio_pct": float(obra.sobreprecio_pct) if obra.sobreprecio_pct else None,
            "fuente": obra.fuente,
        })
    return result, total


def get_empresa_detail(db: Session, empresa_id: str):
    empresa = db.query(Empresa).filter_by(id=empresa_id).first()
    if not empresa:
        return None

    obras = (
        db.query(ObraPublica)
        .filter_by(empresa_id=empresa_id)
        .order_by(desc(ObraPublica.sobreprecio_score))
        .limit(20)
        .all()
    )
    presencias = db.query(EmpresaPais).filter_by(empresa_id=empresa_id).all()

    return {
        "id": empresa.id,
        "nombre_canónico": empresa.nombre_canónico,
        "paises": empresa.paises or [],
        "score_riesgo": float(empresa.score_riesgo) if empresa.score_riesgo else 0,
        "total_contratos": empresa.total_contratos or 0,
        "total_adjudicado": float(empresa.total_adjudicado) if empresa.total_adjudicado else 0,
        "sobreprecio_prom": float(empresa.sobreprecio_prom) if empresa.sobreprecio_prom else 0,
        "obras": [
            {
                "id": o.id, "titulo": o.titulo, "pais": o.pais,
                "monto_adjudicado": float(o.monto_adjudicado) if o.monto_adjudicado else None,
                "sobreprecio_pct": float(o.sobreprecio_pct) if o.sobreprecio_pct else None,
                "fecha_adjudicacion": str(o.fecha_adjudicacion) if o.fecha_adjudicacion else None,
            }
            for o in obras
        ],
        "presencias": [
            {"pais": p.pais, "nombre_local": p.nombre_local, "tax_id": p.tax_id}
            for p in presencias
        ],
    }


def get_global_stats(db: Session) -> dict:
    total_obras       = db.query(func.count(ObraPublica.id)).scalar() or 0
    total_empresas    = db.query(func.count(Empresa.id)).scalar() or 0
    total_cotizaciones= db.query(func.count(Cotizacion.id)).scalar() or 0
    avg_sp            = db.query(func.avg(ObraPublica.sobreprecio_pct)).scalar()
    obras_riesgo      = db.query(func.count(ObraPublica.id)).filter(
        ObraPublica.sobreprecio_score >= 70
    ).scalar() or 0
    paises_rows       = db.query(ObraPublica.pais).distinct().all()

    return {
        "total_obras":        total_obras,
        "total_empresas":     total_empresas,
        "total_cotizaciones": total_cotizaciones,
        "paises":             [r[0] for r in paises_rows],
        "avg_sobreprecio":    float(avg_sp) if avg_sp else 0,
        "obras_alto_riesgo":  obras_riesgo,
    }


def get_scraping_logs(db: Session):
    logs = db.query(ScrapingLog).order_by(desc(ScrapingLog.inicio)).limit(10).all()
    return [
        {
            "fuente": l.fuente, "pais": l.pais,
            "inicio": str(l.inicio), "fin": str(l.fin) if l.fin else None,
            "registros": l.registros, "errores": l.errores, "estado": l.estado,
        }
        for l in logs
    ]
