from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text, case
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
    page=1, page_size=20, order_by="sobreprecio_score",
    busqueda=None,
):
    q = db.query(ObraPublica).filter(~ObraPublica.fuente.in_(["SECOP", "SECOP1"]))
    if pais:
        q = q.filter(ObraPublica.pais == pais.upper())
    if categoria:
        q = q.filter(ObraPublica.categoria.ilike(f"%{categoria}%"))
    if min_score:
        q = q.filter(ObraPublica.sobreprecio_score >= min_score)
    if busqueda:
        emp_ids = db.query(Empresa.id).filter(
            Empresa.nombre_canónico.ilike(f"%{busqueda}%")
        ).subquery()
        q = q.filter(
            ObraPublica.titulo.ilike(f"%{busqueda}%") |
            ObraPublica.empresa_id.in_(emp_ids)
        )

    col = getattr(ObraPublica, order_by, ObraPublica.sobreprecio_score)
    # Contratos de usuarios siempre primero, luego por score desc
    usuario_primero = case(
        (ObraPublica.fuente == "usuario_contribucion", 0), else_=1
    )
    items = (
        q.order_by(usuario_primero, desc(col).nulls_last())
        .offset((page - 1) * page_size)
        .limit(page_size + 1)
        .all()
    )
    has_more = len(items) > page_size
    items = items[:page_size]
    total = (page - 1) * page_size + len(items) + (page_size if has_more else 0)

    # Una sola query para todas las empresas en lugar de N+1
    empresa_ids = [o.empresa_id for o in items if o.empresa_id]
    empresa_map: dict = {}
    if empresa_ids:
        empresas = db.query(Empresa.id, Empresa.nombre_canónico).filter(
            Empresa.id.in_(empresa_ids)
        ).all()
        empresa_map = {str(e.id): e.nombre_canónico for e in empresas}

    result = []
    for obra in items:
        result.append({
            "id": obra.id,
            "titulo": obra.titulo,
            "pais": obra.pais,
            "entidad_compradora": obra.entidad_compradora,
            "empresa_nombre": empresa_map.get(str(obra.empresa_id)) if obra.empresa_id else None,
            "empresa_id": obra.empresa_id,
            "monto_adjudicado": float(obra.monto_adjudicado) if obra.monto_adjudicado else None,
            "moneda": obra.moneda,
            "fecha_adjudicacion": obra.fecha_adjudicacion,
            "sobreprecio_score": float(obra.sobreprecio_score) if obra.sobreprecio_score is not None else None,
            "sobreprecio_pct": float(obra.sobreprecio_pct) if obra.sobreprecio_pct is not None else None,
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


def batch_update_scores(db: Session, pais: str | None = None, solo_sin_score: bool = True) -> dict:
    """
    Calcula sobreprecio_score/pct por percentil de categoría para contratos sin ítems.
    Útil para contratos BID/IDB que no tienen precio_unitario por línea.
    """
    from categoria_scoring import score_by_category

    q = db.query(ObraPublica).filter(
        ~ObraPublica.fuente.in_(["SECOP", "SECOP1"]),
        ObraPublica.monto_adjudicado > 0,
    )
    if solo_sin_score:
        q = q.filter(ObraPublica.sobreprecio_score == 0)
    if pais:
        q = q.filter(ObraPublica.pais == pais.upper())

    obras = q.all()

    # Calcular primero, actualizar después (evita retroalimentación en percentiles)
    updates: list[tuple[str, float, float]] = []
    errores = 0

    for obra in obras:
        try:
            r = score_by_category(
                db=db,
                obra_id=str(obra.id),
                monto=float(obra.monto_adjudicado),
                pais=obra.pais,
                categoria=obra.categoria,
                genera_ia=False,
            )
            if r.n_contratos >= 2:
                updates.append((str(obra.id), r.score, r.sobreprecio_pct))
        except Exception:
            errores += 1

    for obra_id, score, pct in updates:
        db.query(ObraPublica).filter_by(id=obra_id).update({
            "sobreprecio_score": score,
            "sobreprecio_pct": pct,
        })
    db.commit()

    return {
        "procesadas": len(obras),
        "actualizadas": len(updates),
        "errores": errores,
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
