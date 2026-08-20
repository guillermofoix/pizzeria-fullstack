#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE UTILIDAD: BACKUP AUTOMÁTICO DE BASE DE DATOS (POSTGRESQL)
# ==============================================================================
# Uso: ./scripts/backup.sh
# ==============================================================================

set -e

# Crear carpeta de backups si no existe
mkdir -p backups

# Generar nombre de archivo con marca temporal exacta
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="backups/backup_pizzeria_${TIMESTAMP}.sql"

echo "📦 [1/2] Iniciando volcado de seguridad de PostgreSQL..."

# Detectar si se está ejecutando el contenedor de producción o desarrollo
if docker ps --format '{{.Names}}' | grep -q "pizzeria-prod-db"; then
  CONTAINER_NAME="pizzeria-prod-db"
else
  CONTAINER_NAME="pizzeria-db"
fi

# Ejecutar pg_dump dentro del contenedor activo
docker exec "$CONTAINER_NAME" pg_dump -U pizzeria_user -d pizzeria_db > "$BACKUP_FILE"

FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "✅ [2/2] ¡Copia de seguridad completada con éxito!"
echo "📁 Archivo generado: $BACKUP_FILE ($FILE_SIZE)"
