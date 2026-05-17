from __future__ import annotations
import asyncio
import csv
import io
import re
from datetime import datetime
from sqlalchemy.orm import Session
from .base import BaseScraper


class ElSalvadorScraper(BaseScraper):
    COUNTRY_CODE = "SV"
    SOURCE_NAME  = "COMPRASAL"

    BASE      = "https://www.comprasal.gob.sv"
    API_BASE  = f"{BASE}/comprasal_web/rest"
    OCDS_API  = f"{BASE}/comprasal_web/ocds"
    DATOS_API = "https://www.datos.gob.sv/api/3/action/datastore_search"

    def __init__(self, db: Session):
        super().__init__(db, rate=1.5, concurrency=4)

    async def scrape_ocds(self, max_records: int) -> int:
        self.log.info("[SV] COMPRASAL OCDS")
        page  = 1
        total = 0

        while total < max_records:
            data = await self.get(
                f"{self.OCDS_API}/release-packages",
                params={"page": page, "pageSize": 50},
            )
            if not data:
                break
            releases = data if isinstance(data, list) else (
                data.get("releases") or data.get("releasePackages") or []
            )
            if not releases:
                break
            for item in releases:
                if total >= max_records:
                    break
                inner = item.get("releases") or ([item] if item.get("ocid") else [])
                for r in inner:
                    record = self.ocds_to_internal(r)
                    if record:
                        record["moneda"] = record.get("moneda") or "USD"
                        if self.upsert_obra(record):
                            total += 1
            self.log.info(f"[SV] OCDS p{page}: {total}/{max_records}")
            page += 1
            if len(releases) < 50:
                break
        return total

    async def scrape_api_rest(self, max_records: int) -> int:
        self.log.info("[SV] API REST COMPRASAL")
        total  = 0
        offset = 0

        endpoints = [
            f"{self.API_BASE}/contratos",
            f"{self.API_BASE}/adquisiciones",
            f"{self.BASE}/comprasal_web/publico/listadoContratosJSON",
        ]

        for endpoint in endpoints:
            if total >= max_records:
                break
            offset = 0
            while total < max_records:
                data = await self.get(endpoint, params={"inicio": offset, "fin": offset + 50})
                if not data:
                    break
                rows = data if isinstance(data, list) else (
                    data.get("contratos") or data.get("data") or data.get("items") or []
                )
                if not rows:
                    break
                for row in rows:
                    if total >= max_records:
                        break
                    r = self._row_to_internal(row)
                    if r and self.upsert_obra(r):
                        total += 1
                self.log.info(f"[SV] {endpoint.split('/')[-1]} offset={offset}: {total}/{max_records}")
                offset += 50
                if len(rows) < 50:
                    break

        return total

    async def scrape_datos_sv(self, max_records: int) -> int:
        self.log.info("[SV] datos.gob.sv")
        total  = 0
        offset = 0
        resource_ids = ["comprasal-contratos", "sv-compras-publicas"]

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
                self.log.info(f"[SV] datos.sv offset={offset}: {total}/{max_records}")
                if len(records) < 100:
                    break
        return total

    def _row_to_internal(self, row: dict) -> dict | None:
        try:
            ref = str(row.get("Referencia") or row.get("referencia") or
                      row.get("NumeroExpediente") or row.get("id") or "")
            if not ref:
                return None
            monto = float(re.sub(r"[^\d.]",
                "", str(row.get("MontoAdjudicado") or row.get("monto") or row.get("importe") or "0")) or 0)
            return {
                "ocid":               f"ocds-sv-{ref}",
                "titulo":             str(row.get("Objeto") or row.get("descripcion") or row.get("titulo") or "")[:500],
                "pais":               "SV",
                "entidad_compradora": str(row.get("Institucion") or row.get("entidad") or "")[:300],
                "empresa_nombre":     str(row.get("Proveedor") or row.get("proveedor") or row.get("empresa") or "")[:300],
                "empresa_tax_id":     str(row.get("NIT") or row.get("nit") or ""),
                "monto_adjudicado":   monto,
                "moneda":             "USD",
                "fecha_adjudicacion": self._parse_date(row.get("FechaAdjudicacion") or row.get("fecha")),
                "numero_contrato":    str(row.get("NumeroContrato") or ref)[:100],
                "fuente":             "COMPRASAL",
                "raw_data":           {},
            }
        except Exception:
            return None

    @staticmethod
    def _parse_date(s) -> str | None:
        if not s:
            return None
        for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(str(s).strip()[:10], fmt).date().isoformat()
            except ValueError:
                continue
        return None

    async def scrape(self, max_records: int | None = None) -> int:
        max_records = max_records or 10_000
        total = await self.scrape_ocds(max_records)
        if total < 100:
            total += await self.scrape_api_rest(max_records - total)
        if total < 100:
            total += await self.scrape_datos_sv(max_records - total)
        return total
