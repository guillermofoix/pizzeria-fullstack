# ==============================================================================
# SCRIPT DE UTILIDAD: BACKUP AUTOMÁTICO DE BASE DE DATOS (POWERSHELL)
# ==============================================================================
# Uso: .\scripts\backup.ps1
# ==============================================================================

$ErrorActionPreference = "Stop"

# Crear carpeta de backups si no existe
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

# Generar nombre con marca temporal
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = "backups\backup_pizzeria_$timestamp.sql"

Write-Host "📦 [1/2] Iniciando volcado de seguridad de PostgreSQL..." -ForegroundColor Cyan

# Detectar contenedor activo
$runningContainers = docker ps --format "{{.Names}}"
if ($runningContainers -match "pizzeria-prod-db") {
    $containerName = "pizzeria-prod-db"
} else {
    $containerName = "pizzeria-db"
}

# Ejecutar pg_dump
docker exec $containerName pg_dump -U pizzeria_user -d pizzeria_db > $backupFile

$fileInfo = Get-Item $backupFile
Write-Host "✅ [2/2] ¡Copia de seguridad completada con éxito!" -ForegroundColor Green
Write-Host "📁 Archivo generado: $backupFile ($([math]::Round($fileInfo.Length / 1KB, 2)) KB)" -ForegroundColor Yellow
