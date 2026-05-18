from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class CotizacionResponse(BaseModel):
    id: str
    sobreprecio_score: Optional[float]
    sobreprecio_pct: Optional[float]
    pais: Optional[str]
    moneda: Optional[str]
    narrativa_ia: Optional[str]
    items: Optional[Any]
    resultado: Optional[Any]
    created_at: datetime

    class Config:
        from_attributes = True


class ObraItem(BaseModel):
    id: str
    titulo: str
    pais: str
    entidad_compradora: Optional[str]
    empresa_nombre: Optional[str]
    empresa_id: Optional[str]
    monto_adjudicado: Optional[float]
    moneda: Optional[str]
    fecha_adjudicacion: Optional[Any]
    sobreprecio_score: Optional[float]
    sobreprecio_pct: Optional[float]
    fuente: Optional[str]

    class Config:
        from_attributes = True


class ObraListResponse(BaseModel):
    items: list[ObraItem]
    total: int
    page: int
    page_size: int


class EmpresaDetail(BaseModel):
    id: str
    nombre_canónico: str
    paises: Optional[list[str]]
    score_riesgo: Optional[float]
    total_contratos: Optional[int]
    total_adjudicado: Optional[float]
    sobreprecio_prom: Optional[float]
    obras: Optional[list[Any]]
    presencias: Optional[list[Any]]

    class Config:
        from_attributes = True


class ScrapeRequest(BaseModel):
    pais: Optional[str] = None
    max_records: Optional[int] = 5000


class StatsResponse(BaseModel):
    total_obras: int
    total_empresas: int
    total_cotizaciones: int
    paises: list[str]
    avg_sobreprecio: Optional[float]
    obras_alto_riesgo: int


class PublicarEnRadarRequest(BaseModel):
    entidad_compradora: str
    titulo: Optional[str] = None
    empresa_nombre: Optional[str] = None
