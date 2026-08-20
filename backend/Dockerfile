# ==============================================================================
# DOCKERFILE - BACKEND API (Node.js 20 Alpine)
# ==============================================================================
FROM node:20-alpine

# Establecer directorio de trabajo en el contenedor
WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --omit=dev

# Copiar el resto del código fuente del backend
COPY . .

# Exponer el puerto de la API REST
EXPOSE 3000

# Comando de arranque
CMD ["node", "src/server.js"]
