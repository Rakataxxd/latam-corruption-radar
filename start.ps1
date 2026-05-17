# LatAm Corruption Radar — Startup Script
# Usage: .\start.ps1 [--ngrok]

param([switch]$ngrok)

$root = $PSScriptRoot
$api  = Join-Path $root "apps\api"
$web  = Join-Path $root "apps\web"

Write-Host ""
Write-Host "  LatAm Corruption Radar" -ForegroundColor Red
Write-Host "  ========================" -ForegroundColor DarkRed
Write-Host ""

# Check .env
if (-not (Test-Path (Join-Path $api ".env"))) {
    Write-Host "  [!] No se encontro apps/api/.env" -ForegroundColor Yellow
    Write-Host "      Copia .env.example → apps/api/.env y completa las claves." -ForegroundColor DarkYellow
    Write-Host ""
}

# Start FastAPI
Write-Host "  [1/3] Iniciando API (puerto 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$api'; Write-Host 'API corriendo en http://localhost:8000' -ForegroundColor Green; uvicorn main:app --reload --port 8000"
) -WindowStyle Normal

Start-Sleep -Milliseconds 1500

# Start Next.js
Write-Host "  [2/3] Iniciando Web (puerto 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$web'; Write-Host 'Web corriendo en http://localhost:3000' -ForegroundColor Green; npm run dev"
) -WindowStyle Normal

# Optionally start ngrok
if ($ngrok) {
    Start-Sleep -Milliseconds 2000
    Write-Host "  [3/3] Iniciando ngrok..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "ngrok http 8000"
    ) -WindowStyle Normal
    Write-Host "        Copia la URL https://xxxx.ngrok.io para Make.com" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "  Listo!" -ForegroundColor Green
Write-Host "  API:      http://localhost:8000" -ForegroundColor White
Write-Host "  API docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Web:      http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  Para exponer el webhook a Make.com:" -ForegroundColor DarkGray
Write-Host "  .\start.ps1 -ngrok" -ForegroundColor DarkGray
Write-Host ""
