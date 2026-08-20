# ==============================================================================
# SCRIPT DE UTILIDAD: DESPLIEGUE EN PRODUCCIÓN (POWERSHELL)
# ==============================================================================
# Uso: .\scripts\deploy.ps1
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 [1/3] Preparando entorno de producción..." -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Host "⚠️ Advertencia: No se encontró '.env'. Copiando desde '.env.example'..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "🐳 [2/3] Compilando imágenes y arrancando contenedores de producción..." -ForegroundColor Cyan
docker compose -f docker-compose.prod.yml up -d --build

Write-Host "🔍 [3/3] Verificando estado de los servicios..." -ForegroundColor Cyan
docker compose -f docker-compose.prod.yml ps

Write-Host "`n✅ ¡Despliegue completado con éxito!" -ForegroundColor Green
Write-Host "🌐 Web Comercial & KDS: http://localhost:8080" -ForegroundColor Yellow
Write-Host "📱 WebApp Móvil QR:     http://localhost:8081" -ForegroundColor Yellow
