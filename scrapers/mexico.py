from __future__ import annotations
import asyncio
import csv
import io
import re
from datetime import datetime
from sqlalchemy.orm import Session
from .base import BaseScraper


class MexicoScraper(BaseScraper):
    COUNTRY_CODE = "MX"
    SOURCE_NAME  = "COMPRANET"

    # API pública datos.gob.mx — contratos federales OCDS
    OCDS_RELEASES = "https://api.datos.gob.mx/v1/contratacionesabiertas"
    # Datos abiertos compranet CSV
    COMPRANET_CSV = "https://datos.gob.mx/api/action/datastore_search"
    RESOURCE_IDS  = [
        "9de7c3b8-5a8d-4c9e-b1f2-3d7e8f9a0b1c",  # contratos
        "7f3c2a1b-4e5d-6f7a-8b9c-0d1e2f3a4b5c",
    ]

    def __init__(self, db: Session):
        super().__init__(db, rate=4.0, concurrency=10)

    async def _fetch_ocds_page(self, page: int, pagesize: int = 100) -> list[dict]:
        data = await self.get(
            self.OCDS_RELEASES,
            params={"pageSize": pagesize, "page": page},
        )
        if not data:
            return []
        # Diferentes formatos posibles
        if isinstance(data, list):
            return data
        return (
            data.get("releases")
            or data.get("data")
            or data.get("results")
            or []
        )

    async def scrape_ocds(self, max_records: int) -> int:
        self.log.info(f"[MX] OCDS API, max={max_records:,}")
        page  = 1
        total = 0
        consecutive_empty = 0

        while total < max_records:
            releases = await self._fetch_ocds_page(page)
            if not releases:
                consecutive_empty += 1
                if consecutive_empty >= 3:
                    break
                page += 1
                continue
            consecutive_empty = 0

            tasks   = [asyncio.create_task(self._proc(r)) for r in releases]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            saved   = sum(1 for r in results if r is True)
            total  += saved
            self.log.info(f"[MX] p{page}: +{saved} | total={total}")
            page += 1
            if len(releases) < 50:
                break

        return total

    async def _proc(self, release: dict) -> bool:
        record = self.ocds_to_internal(release)
        if not record:
            return False
        record["moneda"] = record.get("moneda") or "MXN"
        return self.upsert_obra(record)

    async def scrape_datos_csv(self, max_records: int) -> int:
        """Scraping de datos.gob.mx en formato CSV/JSON paginado."""
        self.log.info("[MX] datos.gob.mx paginado")
        total  = 0
        offset = 0

        while total < max_records:
            data = await self.get(
                "https://api.datos.gob.mx/v1/sitios-compranet",
                params={"pageSize": 200, "page": offset // 200 + 1},
            )
            if not data:
                break

            records = []
            if isinstance(data, list):
                records = data
            elif isinstance(data, dict):
                records = data.get("results") or data.get("data") or []

            if not records:
                break

            for row in records:
                if total >= max_records:
                    break
                r = self._row_to_internal(row)
                if r and self.upsert_obra(r):
                    total += 1

            self.log.info(f"[MX] CSV offset={offset}: {total}/{max_records}")
            offset += 200
            if len(records) < 200:
                break

        return total

    def _row_to_internal(self, row: dict) -> dict | None:
        try:
            exp = str(row.get("NUMERO_EXPEDIENTE") or row.get("expediente") or row.get("id") or "")
            if not exp:
                return None
            monto_raw = str(row.get("IMPORTE_CONTRATO") or row.get("monto") or row.get("precio_total") or "0")
            monto = float(re.sub(r"[^\d.]", "", monto_raw) or 0)
            return {
                "ocid":               f"ocds-mx-{exp}",
                "titulo":             (row.get("TITULO_CONTRATO") or row.get("descripcion") or row.get("titulo") or "Sin título")[:500],
                "descripcion":        str(row.get("DESCRIPCION") or "")[:1000],
                "pais":               "MX",
                "entidad_compradora": str(row.get("DEPENDENCIA") or row.get("entidad") or "")[:300],
                "empresa_nombre":     str(row.get("PROVEEDOR_CONTRATISTA") or row.get("proveedor") or "")[:300],
                "empresa_tax_id":     str(row.get("RFC") or row.get("rfc") or ""),
                "monto_adjudicado":   monto,
                "moneda":             "MXN",
                "fecha_adjudicacion": self._parse_date(row.get("FECHA_INICIO") or row.get("fecha")),
                "numero_contrato":    str(row.get("NUMERO_CONTRATO") or exp)[:100],
                "fuente":             "COMPRANET",
                "raw_data":           {},
            }
        except Exception:
            return None

    @staticmethod
    def _parse_date(s) -> str | None:
        if not s:
            return None
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y"):
            try:
                return datetime.strptime(str(s).strip()[:10], fmt).date().isoformat()
            except ValueError:
                continue
        return None

    async def scrape(self, max_records: int | None = None) -> int:
        max_records = max_records or 50_000
        total = await self.scrape_ocds(max_records)
        if total < 100:
            self.log.info("[MX] OCDS devolvió poco, intentando datos.gob.mx")
            total += await self.scrape_datos_csv(max_records - total)
        return total
