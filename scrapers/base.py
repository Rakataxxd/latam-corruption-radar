from __future__ import annotations
import asyncio
import logging
import time
from abc import ABC, abstractmethod

import httpx
from sqlalchemy.orm import Session

logger = logging.getLogger("scraper")


class RateLimiter:
    def __init__(self, calls_per_second: float = 3.0):
        self._min_interval = 1.0 / calls_per_second
        self._last_call = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.monotonic()
            wait = self._min_interval - (now - self._last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_call = time.monotonic()


class BaseScraper(ABC):
    COUNTRY_CODE: str = ""
    SOURCE_NAME:  str = ""

    def __init__(self, db: Session, rate: float = 3.0, concurrency: int = 8):
        self.db        = db
        self.limiter   = RateLimiter(rate)
        self.semaphore = asyncio.Semaphore(concurrency)
        self.log       = logging.getLogger(f"scraper.{self.COUNTRY_CODE}")
        self._saved    = 0
        self._errors   = 0

    async def get(self, url: str, **kwargs) -> dict | list | None:
        await self.limiter.acquire()
        async with self.semaphore:
            try:
                async with httpx.AsyncClient(
                    timeout=30,
                    headers={"User-Agent": "LatAmCorruptionRadar/1.0 research@hackathon.dev"},
                    follow_redirects=True,
                ) as client:
                    r = await client.get(url, **kwargs)
                    r.raise_for_status()
                    return r.json()
            except Exception as e:
                self.log.warning(f"GET {url} failed: {e}")
                self._errors += 1
                return None

    async def get_bytes(self, url: str, **kwargs) -> bytes | None:
        await self.limiter.acquire()
        async with self.semaphore:
            try:
                async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
                    r = await client.get(url, **kwargs)
                    r.raise_for_status()
                    return r.content
            except Exception as e:
                self.log.warning(f"GET bytes {url} failed: {e}")
                self._errors += 1
                return None

    def ocds_to_internal(self, release: dict) -> dict | None:
        try:
            awards   = release.get("awards") or []
            award    = awards[0] if awards else {}
            suppliers = award.get("suppliers") or []
            supplier  = suppliers[0] if suppliers else {}
            tender    = release.get("tender") or {}
            buyer     = release.get("buyer") or {}

            amount = (
                (award.get("value") or {}).get("amount")
                or (tender.get("value") or {}).get("amount")
            )
            currency = (
                (award.get("value") or {}).get("currency")
                or (tender.get("value") or {}).get("currency")
                or "USD"
            )
            return {
                "ocid":               release.get("ocid"),
                "titulo":             (tender.get("title") or release.get("id", ""))[:500],
                "descripcion":        tender.get("description"),
                "pais":               self.COUNTRY_CODE,
                "entidad_compradora": (buyer.get("name") or "")[:300],
                "empresa_nombre":     (supplier.get("name") or "")[:300],
                "empresa_tax_id":     (supplier.get("identifier") or {}).get("id"),
                "monto_adjudicado":   float(amount) if amount else None,
                "moneda":             currency,
                "fecha_adjudicacion": (award.get("date") or "")[:10] or None,
                "numero_contrato":    ((release.get("contracts") or [{}])[0].get("id") or "")[:100],
                "fuente":             self.SOURCE_NAME,
                "raw_data":           {},
            }
        except Exception as e:
            self.log.debug(f"ocds_to_internal failed: {e}")
            return None

    def upsert_obra(self, record: dict) -> bool:
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))
        from models import ObraPublica, Empresa, EmpresaPais

        if not record or not record.get("ocid"):
            return False
        if self.db.query(ObraPublica).filter_by(ocid=record["ocid"]).first():
            return False

        empresa_id = self._resolve_empresa(
            record.pop("empresa_nombre", None),
            record.pop("empresa_tax_id", None),
        )
        record["empresa_id"] = empresa_id

        # Limpiar campos que no son columnas
        allowed = {
            "ocid","titulo","descripcion","pais","entidad_compradora",
            "empresa_id","monto_adjudicado","moneda","fecha_adjudicacion",
            "numero_contrato","fuente","raw_data","sobreprecio_score","sobreprecio_pct",
        }
        record = {k: v for k, v in record.items() if k in allowed}

        try:
            self.db.add(ObraPublica(**record))
            self.db.commit()
            self._saved += 1
            return True
        except Exception as e:
            self.db.rollback()
            self.log.debug(f"upsert failed: {e}")
            return False

    def _resolve_empresa(self, nombre: str | None, tax_id: str | None) -> str | None:
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))
        from models import Empresa, EmpresaPais
        from sqlalchemy import text

        if not nombre:
            return None

        if tax_id:
            ep = self.db.query(EmpresaPais).filter_by(
                pais=self.COUNTRY_CODE, tax_id=tax_id
            ).first()
            if ep:
                return ep.empresa_id

        try:
            row = self.db.execute(
                text("SELECT id FROM empresa_pais WHERE pais=:p AND similarity(nombre_local,:n)>0.7 ORDER BY similarity(nombre_local,:n) DESC LIMIT 1"),
                {"p": self.COUNTRY_CODE, "n": nombre}
            ).fetchone()
            if row:
                return str(row[0])
        except Exception:
            pass

        empresa = Empresa(nombre_canónico=nombre[:300], paises=[self.COUNTRY_CODE])
        self.db.add(empresa)
        self.db.flush()
        ep = EmpresaPais(
            empresa_id=empresa.id, pais=self.COUNTRY_CODE,
            nombre_local=nombre[:300], tax_id=tax_id, fuente=self.SOURCE_NAME,
        )
        self.db.add(ep)
        try:
            self.db.commit()
            return str(empresa.id)
        except Exception:
            self.db.rollback()
            return None

    @property
    def stats(self) -> dict:
        return {"saved": self._saved, "errors": self._errors}

    @abstractmethod
    async def scrape(self, max_records: int | None = None) -> int: ...
