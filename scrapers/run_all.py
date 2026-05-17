import asyncio
import logging
import sys
import os
from pathlib import Path

# Cargar .env desde la raíz del proyecto
ROOT = Path(__file__).parent.parent
ENV_FILE = ROOT / ".env"
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, str(ROOT / "apps" / "api"))

from sqlalchemy.orm import Session

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
logger = logging.getLogger("orchestrator")

DEFAULT_MAX = {"MX": 50_000, "GT": 20_000, "SV": 10_000, "PE": 25_000}


async def _run_one(country: str, max_records: int, db: Session):
    if country == "MX":
        from scrapers.mexico import MexicoScraper as Cls
    elif country == "GT":
        from scrapers.guatemala import GuatemalaScraper as Cls
    elif country == "SV":
        from scrapers.elsalvador import ElSalvadorScraper as Cls
    elif country == "PE":
        from scrapers.peru import PeruScraper as Cls
    else:
        logger.warning(f"Sin scraper para {country}")
        return 0

    scraper = Cls(db)
    logger.info(f"▶ {country} max={max_records:,}")
    n = await scraper.scrape(max_records)
    logger.info(f"✔ {country}: {n:,} registros | errores: {scraper.stats['errors']}")
    return n


async def run_all(db: Session, max_per_country: int | None = None):
    tasks = [
        _run_one(code, max_per_country or DEFAULT_MAX[code], db)
        for code in DEFAULT_MAX
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    total = sum(r for r in results if isinstance(r, int))
    logger.info(f"🏁 Total: {total:,} registros")
    return total


async def run_scraper(pais: str | None, max_records: int | None, db: Session):
    if pais and pais.upper() in DEFAULT_MAX:
        await _run_one(pais.upper(), max_records or DEFAULT_MAX[pais.upper()], db)
    else:
        await run_all(db, max_records)


if __name__ == "__main__":
    from database import SessionLocal
    from models import Base
    from database import engine
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    pais_arg = sys.argv[1].upper() if len(sys.argv) > 1 else None
    max_arg  = int(sys.argv[2]) if len(sys.argv) > 2 else None
    asyncio.run(run_scraper(pais_arg, max_arg, db))
    db.close()
