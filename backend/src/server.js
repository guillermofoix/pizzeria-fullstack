import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection, query } from './config/db.js';

import pizzasRoutes from './routes/pizzasRoutes.js';
import pedidosRoutes from './routes/pedidosRoutes.js';
import mesasRoutes from './routes/mesasRoutes.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares Globales ──────────────────────────────────────────────────
app.use(cors({
  origin: '*', // Permitir peticiones de ambos frontends (Web DAW y QR DAM)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(morgan('dev'));

// ─── Ruta de Salud y Diagnóstico (Healthcheck) ─────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await query('SELECT NOW() AS timestamp');
    res.json({
      status: 'UP',
      service: 'pizzeria-backend',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        db_time: dbStatus.rows[0].timestamp
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'DEGRADED',
      service: 'pizzeria-backend',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

// ─── Montaje de Rutas de la API ───────────────────────────────────────────
app.use('/api/pizzas', pizzasRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/mesas', mesasRoutes);

// Ruta base con información didáctica
app.get('/', (req, res) => {
  res.json({
    message: '🍕 ¡Bienvenido a la API REST de la Pizzería Full-Stack (DAW & DAM)!',
    endpoints: {
      health: '/api/health',
      pizzas: '/api/pizzas',
      pedidos: '/api/pedidos',
      mesas: '/api/mesas'
    },
    documentation: 'Consulta el archivo README.md para más detalles.'
  });
});

// ─── Manejo de Errores 404 y Centralizado ──────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada en este servidor`
  });
});

app.use((err, req, res, next) => {
  console.error('💥 [Error Inesperado]:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno no controlado en el servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─── Arranque del Servidor ────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`========================================================`);
  console.log(`🚀 API Pizzería escuchando en http://0.0.0.0:${PORT}`);
  console.log(`🍕 Endpoints disponibles: /api/pizzas | /api/pedidos | /api/mesas`);
  console.log(`========================================================`);
  
  // Probar conexión con la base de datos
  await testConnection();
});
