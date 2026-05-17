import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Numeric, Integer, Boolean,
    DateTime, Date, ForeignKey, Text, ARRAY
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Empresa(Base):
    __tablename__ = "empresas"
    id               = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    nombre_canónico  = Column(Text, nullable=False)
    nombres_alias    = Column(ARRAY(Text), default=[])
    paises           = Column(ARRAY(String(2)), default=[])
    score_riesgo     = Column(Numeric(5, 2), default=0)
    total_contratos  = Column(Integer, default=0)
    total_adjudicado = Column(Numeric(20, 2), default=0)
    sobreprecio_prom = Column(Numeric(10, 4), default=0)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    obras            = relationship("ObraPublica", back_populates="empresa")
    presencias       = relationship("EmpresaPais", back_populates="empresa")


class EmpresaPais(Base):
    __tablename__ = "empresa_pais"
    id           = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    empresa_id   = Column(UUID(as_uuid=False), ForeignKey("empresas.id", ondelete="CASCADE"))
    pais         = Column(String(2), nullable=False)
    nombre_local = Column(Text, nullable=False)
    tax_id       = Column(Text)
    fuente       = Column(String(30), nullable=False)
    url_perfil   = Column(Text)
    created_at   = Column(DateTime, default=datetime.utcnow)
    empresa      = relationship("Empresa", back_populates="presencias")


class ObraPublica(Base):
    __tablename__ = "obras_publicas"
    id                 = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    ocid               = Column(Text, unique=True)
    titulo             = Column(Text, nullable=False)
    descripcion        = Column(Text)
    pais               = Column(String(2), nullable=False)
    entidad_compradora = Column(Text)
    empresa_id         = Column(UUID(as_uuid=False), ForeignKey("empresas.id"))
    monto_adjudicado   = Column(Numeric(20, 2))
    monto_referencia   = Column(Numeric(20, 2))
    moneda             = Column(String(3), default="USD")
    fecha_adjudicacion = Column(Date)
    numero_contrato    = Column(Text)
    categoria          = Column(Text)
    url_fuente         = Column(Text)
    pdf_url            = Column(Text)
    items              = Column(JSONB)
    sobreprecio_score  = Column(Numeric(5, 2), default=0)
    sobreprecio_pct    = Column(Numeric(10, 4), default=0)
    fuente             = Column(String(30))
    raw_data           = Column(JSONB)
    procesado          = Column(Boolean, default=False)
    created_at         = Column(DateTime, default=datetime.utcnow)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    empresa            = relationship("Empresa", back_populates="obras")


class PrecioReferencia(Base):
    __tablename__ = "precios_referencia"
    id                   = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    descripcion          = Column(Text, nullable=False)
    unidad               = Column(Text)
    precio_mediana       = Column(Numeric(20, 4), nullable=False)
    precio_p25           = Column(Numeric(20, 4))
    precio_p75           = Column(Numeric(20, 4))
    precio_min           = Column(Numeric(20, 4))
    precio_max           = Column(Numeric(20, 4))
    desviacion_std       = Column(Numeric(20, 4))
    n_muestras           = Column(Integer, default=1)
    pais                 = Column(String(2))
    moneda               = Column(String(3), default="USD")
    fuente               = Column(String(30))
    ultima_actualizacion = Column(DateTime, default=datetime.utcnow)
    created_at           = Column(DateTime, default=datetime.utcnow)


class Cotizacion(Base):
    __tablename__ = "cotizaciones"
    id                = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    nombre_usuario    = Column(Text)
    email             = Column(Text)
    archivo_url       = Column(Text)
    hash_archivo      = Column(Text, unique=True)
    texto_extraido    = Column(Text)
    items             = Column(JSONB)
    resultado         = Column(JSONB)
    sobreprecio_score = Column(Numeric(5, 2))
    sobreprecio_pct   = Column(Numeric(10, 4))
    pais              = Column(String(2))
    moneda            = Column(String(3))
    estado            = Column(String(20), default="completado")
    narrativa_ia      = Column(Text)
    es_publica        = Column(Boolean, default=False)
    created_at        = Column(DateTime, default=datetime.utcnow)


class ScrapingLog(Base):
    __tablename__ = "scraping_log"
    id         = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    fuente     = Column(String(30), nullable=False)
    pais       = Column(String(2), nullable=False)
    inicio     = Column(DateTime, default=datetime.utcnow)
    fin        = Column(DateTime)
    registros  = Column(Integer, default=0)
    errores    = Column(Integer, default=0)
    estado     = Column(String(20), default="corriendo")
    mensaje    = Column(Text)
