# ==============================================================================
# SCRIPT DE UTILIDAD: RESTAURACIÓN DE BASE DE DATOS (POWERSHELL)
# ==============================================================================
# Uso: .\scripts\restore.ps1 [archivo_backup.sql]
# ==============================================================================

param(
    [string]$BackupFile = ""
)

$ErrorActionPreference = "Stop"

# Si no se indica archivo, tomar el más reciente
if (-not $BackupFile) {
    $latest = Get-ChildItem -Path "backups\backup_pizzeria_*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Host "❌ Error: No se encontró ningún archivo de backup en la carpeta 'backups\'." -ForegroundColor Red
        Write-Host "Uso: .\scripts\restore.ps1 [ruta_al_archivo.sql]" -ForegroundColor Yellow
        exit 1
    }
    $BackupFile = $latest.FullName
    Write-Host "ℹ️ Restaurando el backup más reciente: $($latest.Name)" -ForegroundColor Cyan
}

if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ Error: El archivo '$BackupFile' no existe." -ForegroundColor Red
    exit 1
}

Write-Host "🔄 [1/2] Restaurando base de datos desde $BackupFile..." -ForegroundColor Cyan

# Detectar contenedor activo
$runningContainers = docker ps --format "{{.Names}}"
if ($runningContainers -match "pizzeria-prod-db") {
    $containerName = "pizzeria-prod-db"
} else {
    $containerName = "pizzeria-db"
}

# Restaurar datos
Get-Content $BackupFile -Raw | docker exec -i $containerName psql -U pizzeria_user -d pizzeria_db 2>$null

Write-Host "✅ [2/2] ¡Base de datos restaurada con éxito!" -ForegroundColor Green
