#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE UTILIDAD: DESPLIEGUE EN PRODUCCIÓN (PROXMOX / CLOUD)
# ==============================================================================
# Uso: ./scripts/deploy.sh
# ==============================================================================

set -e

echo "🚀 [1/3] Preparando entorno de producción..."

# Comprobar que existe el archivo .env
if [ ! -f ".env" ]; then
  echo "⚠️ Advertencia: No se encontró '.env'. Copiando desde '.env.example'..."
  cp .env.example .env
fi

echo "🐳 [2/3] Compilando imágenes y arrancando contenedores de producción..."
docker compose -f docker-compose.prod.yml up -d --build

echo "🔍 [3/3] Verificando estado de los servicios..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ ¡Despliegue completado con éxito!"
echo "🌐 Web Comercial & KDS: http://localhost:8080"
echo "📱 WebApp Móvil QR:     http://localhost:8081"
