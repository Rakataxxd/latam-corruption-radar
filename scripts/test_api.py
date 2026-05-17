import httpx, json, sys, os
from pathlib import Path

ROOT = Path(__file__).parent.parent
for line in (ROOT / ".env").read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

pdf_path = r"C:\Users\usuario\Desktop\cotizacion_demo.pdf"

with open(pdf_path, "rb") as f:
    data = f.read()

print(f"PDF: {len(data)} bytes")

resp = httpx.post(
    "http://localhost:8000/cotizacion/analizar",
    files={"archivo": ("cotizacion_demo.pdf", data, "application/pdf")},
    data={"pais": "GT", "publica": "false"},
    timeout=120,
)

print("Status:", resp.status_code)
j = resp.json()

if resp.status_code == 200:
    print("ID:", j.get("id"))
    print("Score:", j.get("sobreprecio_score"))
    print("Sobreprecio total:", j.get("sobreprecio_pct"), "%")

    resultado = j.get("resultado") or {}
    items = resultado.get("items") or j.get("items") or []
    print("Items detectados:", len(items))
    for it in items[:5]:
        desc = it.get("descripcion", "")[:45]
        pu   = it.get("precio_unitario", 0)
        sem  = it.get("semaforo", "sin_ref")
        spct = it.get("sobreprecio_pct")
        sp_str = f"{spct:+.1f}%" if spct is not None else "sin ref"
        print(f"  [{sem:12s}] {desc:45s} Q{pu:.2f}  {sp_str}")

    print()
    print("NARRATIVA:")
    print(j.get("narrativa_ia") or "(sin narrativa)")
else:
    print("Error:", resp.text[:500])
