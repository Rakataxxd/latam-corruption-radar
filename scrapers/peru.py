from __future__ import annotations
import asyncio
import re
from sqlalchemy.orm import Session
from .base import BaseScraper


class PeruScraper(BaseScraper):
    COUNTRY_CODE = "PE"
    SOURCE_NAME  = "SEACE"

    OCDS_API   = "https://contrataciones.gob.pe/ocds/r"
    DATOS_API  = "https://www.datosabiertos.gob.pe/api/3/action/datastore_search"
    SEACE_API  = "https://prod2.seace.gob.pe/seacebus-uibd-webapp/buscadorPublico/buscadorPublico.do"

    def __init__(self, db: Session):
        super().__init__(db, rate=3.0, concurrency=8)

    async def scrape_ocds(self, max_records: int) -> int:
        self.log.info(f"[PE] OCDS API, max={max_records:,}")
        page  = 1
        total = 0

        while total < max_records:
            data = await self.get(self.OCDS_API, params={"page": page, "pageSize": 50})
            if not data:
                break
            releases = (
                data.get("releases")
                or data.get("data")
                or (data.get("records") or [{}])[0].get("releases", [])
                or []
            )
            if not releases:
                break
            tasks   = [asyncio.create_task(self._proc(r)) for r in releases]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            saved   = sum(1 for r in results if r is True)
            total  += saved
            self.log.info(f"[PE] OCDS p{page}: +{saved} | total={total}")
            page += 1
            if len(releases) < 50:
                break
        return total

    async def _proc(self, release: dict) -> bool:
        record = self.ocds_to_internal(release)
        if not record:
            return False
        record["moneda"] = record.get("moneda") or "PEN"
        return self.upsert_obra(record)

    async def scrape_datos_abiertos(self, max_records: int) -> int:
        self.log.info("[PE] datos abiertos Peru")
        total  = 0
        offset = 0
        resource_ids = [
            "seace-contratos-2023",
            "contrataciones-estado-pe",
            "osce-contratos",
        ]
        for rid in resource_ids:
            if total >= max_records:
                break
            offset = 0
            while total < max_records:
                data = await self.get(self.DATOS_API,
                    params={"resource_id": rid, "offset": offset, "limit": 100})
                if not data:
                    break
                records = (data.get("result") or {}).get("records") or []
                if not records:
                    break
                for row in records:
                    if total >= max_records:
                        break
                    r = self._row_to_internal(row)
                    if r and self.upsert_obra(r):
                        total += 1
                offset += 100
                self.log.info(f"[PE] {rid} offset={offset}: {total}/{max_records}")
                if len(records) < 100:
                    break
        return total

    def _row_to_internal(self, row: dict) -> dict | None:
        try:
            nro = str(row.get("numero_proceso") or row.get("nro_contrato") or row.get("id") or "")
            if not nro:
                return None
            monto = float(re.sub(r"[^\d.]",
                "", str(row.get("valor_referencial") or row.get("monto") or row.get("importe") or "0")) or 0)
            return {
                "ocid":               f"ocds-pe-{nro}",
                "titulo":             str(row.get("objeto_contratacion") or row.get("descripcion") or row.get("titulo") or "")[:500],
                "pais":               "PE",
                "entidad_compradora": str(row.get("entidad") or row.get("organismo") or "")[:300],
                "empresa_nombre":     str(row.get("proveedor") or row.get("empresa") or row.get("contratista") or "")[:300],
                "empresa_tax_id":     str(row.get("ruc") or ""),
                "monto_adjudicado":   monto,
                "moneda":             "PEN",
                "fecha_adjudicacion": str(row.get("fecha_suscripcion") or row.get("fecha") or "")[:10] or None,
                "numero_contrato":    str(row.get("numero_contrato") or nro)[:100],
                "fuente":             "SEACE",
                "raw_data":           {},
            }
        except Exception:
            return None

    async def scrape(self, max_records: int | None = None) -> int:
        max_records = max_records or 25_000
        total = await self.scrape_ocds(max_records)
        if total < 100:
            total += await self.scrape_datos_abiertos(max_records - total)
        return total
