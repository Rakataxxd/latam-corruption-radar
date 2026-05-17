"""Arranca uvicorn cargando el .env primero."""
import os
from pathlib import Path

env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ[k.strip()] = v.strip()

import uvicorn
uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
