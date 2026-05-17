from __future__ import annotations
import asyncio
import re
from datetime import datetime
from sqlalchemy.orm import Session
from .base import BaseScraper


class GuatemalaScraper(BaseScraper):
    COUNTRY_CODE = "GT"
    SOURCE_NAME  = "GUATECOMPRAS"

    # API datos abiertos Guatemala
    DATOS_API  = "https://od.datos.gob.gt/api/3/action/datastore_search"
    # OCDS Guatemala
    OCDS_API   = "https://www.guatecompras.gt/ocds/api/release-packages"
    # Portal directo
    PORTAL_API = "https://www.guatecompras.gt/concursos/listadoConcursosAjax.aspx"

    def __init__(self, db: Session):
        super().__init__(db, rate=2.0, concurrency=6)

    async def scrape_datos_abiertos(self, max_records: int) -> int:
        self.log.info("[GT] datos abiertos")
        total  = 0
        offset = 0
        resource_ids = [
            "contratos-guatecompras",
            "guatecompras-adjudicaciones",
            "gc-contratos-2023",
        ]

        for resource_id in resource_ids:
            if total >= max_records:
                break
            offset = 0
            while total < max_records:
                data = await self.get(
                    self.DATOS_API,
                    params={"resource_id": resource_id, "offset": offset, "limit": 100},
                )
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
                self.log.info(f"[GT] {resource_id} offset={offset}: {total}/{max_records}")
                if len(records) < 100:
                    break

        return total

    async def scrape_ocds(self, max_records: int) -> int:
        self.log.info("[GT] OCDS API")
        page  = 1
        total = 0

        while total < max_records:
            data = await self.get(self.OCDS_API, params={"page": page, "per_page": 50})
            if not data:
                break
            packages = data if isinstance(data, list) else (data.get("releasePackages") or data.get("releases") or [])
            if not packages:
                break

            for item in packages:
                if total >= max_records:
                    break
                releases = item.get("releases") or ([item] if item.get("ocid") else [])
                for release in releases:
                    record = self.ocds_to_internal(release)
                    if record:
                        record["moneda"] = record.get("moneda") or "GTQ"
                        if self.upsert_obra(record):
                            total += 1

            self.log.info(f"[GT] OCDS p{page}: {total}/{max_records}")
            page += 1
            if len(packages) < 50:
                break

        return total

    async def scrape_portal(self, max_records: int) -> int:
        """Scraping del portal Guatecompras con paginación JSON."""
        self.log.info("[GT] Portal web")
        total = 0
        page  = 1

        while total < max_records:
            data = await self.get(
                self.PORTAL_API,
                params={"pagina": page, "filas": 50, "estado": "ADJ"},
            )
            if not data:
                break

            rows = []
            if isinstance(data, list):
                rows = data
            elif isinstance(data, dict):
                rows = data.get("data") or data.get("aaData") or data.get("rows") or []

            if not rows:
                break

            for row in rows:
                if total >= max_records:
                    break
                r = self._portal_row(row)
                if r and self.upsert_obra(r):
                    total += 1

            self.log.info(f"[GT] Portal p{page}: {total}/{max_records}")
            page += 1
            if len(rows) < 50:
                break

        return total

    def _row_to_internal(self, row: dict) -> dict | None:
        try:
            noc = str(row.get("NOC") or row.get("noc") or row.get("numero") or "")
            if not noc:
                return None
            monto = float(re.sub(r"[^\d.]",
                "", str(row.get("MONTO") or row.get("monto") or row.get("importe") or "0")) or 0)
            return {
                "ocid":               f"ocds-gt-{noc}",
                "titulo":             str(row.get("TITULO") or row.get("titulo") or row.get("descripcion") or "")[:500],
                "pais":               "GT",
                "entidad_compradora": str(row.get("ENTIDAD") or row.get("entidad") or "")[:300],
                "empresa_nombre":     str(row.get("PROVEEDOR") or row.get("proveedor") or row.get("empresa") or "")[:300],
                "empresa_tax_id":     str(row.get("NIT") or row.get("nit") or ""),
                "monto_adjudicado":   monto,
                "moneda":             "GTQ",
                "fecha_adjudicacion": self._parse_date(row.get("FECHA") or row.get("fecha")),
                "fuente":             "GUATECOMPRAS",
                "raw_data":           {},
            }
        except Exception:
            return None

    def _portal_row(self, row) -> dict | None:
        if isinstance(row, dict):
            return self._row_to_internal(row)
        if isinstance(row, list) and len(row) >= 4:
            return {
                "ocid":             f"ocds-gt-web-{row[0]}",
                "titulo":           str(row[2])[:500] if len(row) > 2 else "",
                "pais":             "GT",
                "entidad_compradora": str(row[1])[:300] if len(row) > 1 else None,
                "empresa_nombre":   str(row[4])[:300] if len(row) > 4 else None,
                "monto_adjudicado": float(re.sub(r"[^\d.]", "", str(row[3] or "0")) or 0),
                "moneda":           "GTQ",
                "fuente":           "GUATECOMPRAS",
                "raw_data":         {},
            }
        return None

    @staticmethod
    def _parse_date(s) -> str | None:
        if not s:
            return None
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                return datetime.strptime(str(s).strip()[:10], fmt).date().isoformat()
            except ValueError:
                continue
        return None

    async def scrape(self, max_records: int | None = None) -> int:
        max_records = max_records or 20_000
        total = await self.scrape_ocds(max_records)
        if total < 100:
            total += await self.scrape_datos_abiertos(max_records - total)
        if total < 100:
            total += await self.scrape_portal(max_records - total)
        return total
