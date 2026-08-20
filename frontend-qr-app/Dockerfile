# ==============================================================================
# DOCKERFILE - FRONTEND QR APP (DAM) - Nginx Alpine
# ==============================================================================
FROM nginx:alpine

# Limpiar configuración por defecto
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copiar configuración personalizada con reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos de la WebApp Móvil
COPY src /usr/share/nginx/html

# Exponer el puerto HTTP estándar
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
