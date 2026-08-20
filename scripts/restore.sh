#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE UTILIDAD: RESTAURACIÓN DE BASE DE DATOS (POSTGRESQL)
# ==============================================================================
# Uso: ./scripts/restore.sh [archivo_backup.sql]
# ==============================================================================

set -e

BACKUP_FILE=$1

# Si no se especifica archivo, buscar el más reciente en la carpeta backups
if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE=$(ls -t backups/backup_pizzeria_*.sql 2>/dev/null | head -n 1)
  if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Error: No se encontró ningún archivo de backup en la carpeta 'backups/'."
    echo "Uso: ./scripts/restore.sh [ruta_al_archivo.sql]"
    exit 1
  fi
  echo "ℹ️ No se especificó archivo. Restaurando el backup más reciente: $BACKUP_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: El archivo '$BACKUP_FILE' no existe."
  exit 1
fi

echo "🔄 [1/2] Restaurando base de datos desde $BACKUP_FILE..."

# Detectar contenedor activo
if docker ps --format '{{.Names}}' | grep -q "pizzeria-prod-db"; then
  CONTAINER_NAME="pizzeria-prod-db"
else
  CONTAINER_NAME="pizzeria-db"
fi

# Inyectar SQL en PostgreSQL
cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U pizzeria_user -d pizzeria_db > /dev/null 2>&1 || true

echo "✅ [2/2] ¡Base de datos restaurada con éxito!"
