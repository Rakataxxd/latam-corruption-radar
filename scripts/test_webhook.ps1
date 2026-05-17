# Test del webhook de WhatsApp sin necesitar Make.com ni WhatsApp
# Corre con: .\scripts\test_webhook.ps1

$API = "http://localhost:8000"

Write-Host ""
Write-Host "  Test del Webhook de WhatsApp" -ForegroundColor Cyan
Write-Host "  =============================" -ForegroundColor DarkCyan
Write-Host ""

function Test-Endpoint($nombre, $body) {
    Write-Host "  >> $nombre" -ForegroundColor Yellow
    try {
        $json = $body | ConvertTo-Json -Depth 5
        $r = Invoke-RestMethod -Uri "$API/webhook/whatsapp" -Method POST -Body $json -ContentType "application/json" -TimeoutSec 30
        Write-Host "  Reply:" -ForegroundColor Green
        Write-Host ($r.reply | Out-String) -ForegroundColor White
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# 1. Health check del API
Write-Host "  Verificando que el API este corriendo..." -ForegroundColor DarkGray
try {
    $health = Invoke-RestMethod -Uri "$API/health" -TimeoutSec 5
    Write-Host "  API OK — version $($health.version)" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: El API no esta corriendo en $API" -ForegroundColor Red
    Write-Host "  Ejecuta: .\start.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. Test: mensaje de ayuda
Test-Endpoint "Mensaje: 'ayuda'" @{ from = "+502123"; body = "ayuda"; type = "text" }

# 3. Test: stats
Test-Endpoint "Mensaje: 'stats'" @{ from = "+502123"; body = "stats"; type = "text" }

# 4. Test: busqueda
Test-Endpoint "Mensaje: 'buscar construccion'" @{ from = "+502123"; body = "buscar construccion"; type = "text" }

Write-Host "  Tests completados." -ForegroundColor Green
Write-Host ""
