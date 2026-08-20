import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Configuración del Pool de conexiones a PostgreSQL mediante variables de entorno
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'pizzeria_user',
  password: process.env.DB_PASSWORD || 'pizzeria_pass_1234',
  database: process.env.DB_NAME || 'pizzeria_db',
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 4000,
});

// Evento al conectar un nuevo cliente al Pool
pool.on('connect', () => {
  console.log('📦 [DB] Nueva conexión establecida con PostgreSQL');
});

// Evento de error inesperado en el Pool
pool.on('error', (err) => {
  console.error('❌ [DB Error] Error inesperado en el cliente inactivo de PostgreSQL:', err.message);
});

/**
 * Función auxiliar para ejecutar consultas SQL con control y registro de tiempos
 * @param {string} text - Consulta SQL parametrizada
 * @param {Array} params - Parámetros de la consulta
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ [DB Query] Ejecutada en ${duration}ms | Filas: ${res.rowCount}`);
    }
    return res;
  } catch (error) {
    console.error('❌ [DB Error] Fallo al ejecutar consulta:', {
      text,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Prueba la conectividad con la base de datos al arrancar el servidor
 */
export const testConnection = async () => {
  try {
    const res = await query('SELECT NOW() AS now, current_database() AS db_name');
    console.log(`✅ [DB Conectada] Base de datos "${res.rows[0].db_name}" lista a las ${res.rows[0].now}`);
    return true;
  } catch (error) {
    console.error('⚠️ [DB Warning] No se pudo conectar a la base de datos inmediatamente. Reintentando en siguientes peticiones...', error.message);
    return false;
  }
};

export default pool;
