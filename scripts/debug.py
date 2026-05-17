import sys, os
from pathlib import Path

ROOT = Path(__file__).parent.parent
for line in (ROOT / ".env").read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, str(ROOT / "apps" / "api"))

# ── Test 1: pdfplumber ──────────────────────────────────────
import pdfplumber, io
pdf_path = r"C:\Users\usuario\Desktop\cotizacion_demo.pdf"
with open(pdf_path, "rb") as f:
    data = f.read()

print(f"PDF size: {len(data)} bytes")
with pdfplumber.open(io.BytesIO(data)) as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        print(f"Pagina {i+1}: {len(text or '')} chars")
        if text:
            print(text[:600])

# ── Test 2: Groq ─────────────────────────────────────────────
print("\n--- Groq test ---")
key = os.environ.get("GROQ_API_KEY", "")
print("Key:", key[:20] + "..." if key else "NO KEY")

from groq import Groq
client = Groq(api_key=key)
try:
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Responde solo: OK"}],
        max_tokens=5,
    )
    print("Groq OK:", resp.choices[0].message.content)
except Exception as e:
    print("Groq ERROR:", e)
