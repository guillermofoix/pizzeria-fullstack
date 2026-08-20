import test from 'node:test';
import assert from 'node:assert/strict';
import pool, { query, testConnection } from '../src/config/db.js';

test('1. Conectividad con Base de Datos PostgreSQL', async () => {
  const isConnected = await testConnection();
  assert.equal(isConnected, true, 'La base de datos debe responder correctamente');
});

test('2. Consulta de Catálogo de Pizzas', async () => {
  const res = await query('SELECT id, nombre, precio, disponible FROM pizzas WHERE disponible = TRUE');
  assert.ok(res.rows.length > 0, 'Debe haber al menos una pizza disponible en la base de datos');
  assert.ok(typeof res.rows[0].nombre === 'string', 'La pizza debe tener un nombre de tipo string');
  assert.ok(parseFloat(res.rows[0].precio) > 0, 'El precio de la pizza debe ser mayor a 0');
});

test('3. Consulta de Mesas de Salón', async () => {
  const res = await query('SELECT id, numero, estado FROM mesas ORDER BY numero ASC');
  assert.ok(res.rows.length >= 1, 'Debe haber mesas configuradas en la sala');
});

test('4. Cierre del Pool de Conexiones tras Pruebas', async () => {
  await pool.end();
  assert.ok(true, 'Pool cerrado limpiamente');
});
