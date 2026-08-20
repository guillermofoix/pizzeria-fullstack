# ==============================================================================
# DOCKERFILE - FRONTEND WEB (DAW) - Nginx Alpine
# ==============================================================================
FROM nginx:alpine

# Eliminar la configuración por defecto de Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copiar la configuración personalizada con reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos estáticos de la aplicación
COPY src /usr/share/nginx/html

# Exponer el puerto estándar HTTP
EXPOSE 80

# Arrancar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
