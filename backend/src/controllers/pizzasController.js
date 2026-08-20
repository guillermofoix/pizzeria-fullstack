import pool, { query } from '../config/db.js';

/**
 * Obtener el listado de todas las pizzas disponibles en la carta con sus ingredientes
 */
export const getAllPizzas = async (req, res) => {
  try {
    const { categoria_id, disponible } = req.query;

    let sql = `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.imagen_url,
        p.disponible,
        p.categoria_id,
        c.nombre AS categoria_nombre,
        c.icono AS categoria_icono,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'nombre', i.nombre,
              'alergeno', i.alergeno
            )
          ) FILTER (WHERE i.id IS NOT NULL), '[]'
        ) AS ingredientes
      FROM pizzas p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN pizza_ingredientes pi ON p.id = pi.pizza_id
      LEFT JOIN ingredientes i ON pi.ingrediente_id = i.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (categoria_id) {
      sql += ` AND p.categoria_id = $${paramIndex}`;
      params.push(categoria_id);
      paramIndex++;
    }

    if (disponible !== undefined) {
      sql += ` AND p.disponible = $${paramIndex}`;
      params.push(disponible === 'true');
      paramIndex++;
    }

    sql += `
      GROUP BY p.id, c.nombre, c.icono
      ORDER BY p.id ASC
    `;

    const result = await query(sql, params);
    res.json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error al obtener pizzas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al consultar la carta de pizzas',
      error: error.message,
    });
  }
};

/**
 * Obtener los detalles de una pizza por su ID
 */
export const getPizzaById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.imagen_url,
        p.disponible,
        p.categoria_id,
        c.nombre AS categoria_nombre,
        c.icono AS categoria_icono,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'nombre', i.nombre,
              'alergeno', i.alergeno
            )
          ) FILTER (WHERE i.id IS NOT NULL), '[]'
        ) AS ingredientes
      FROM pizzas p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN pizza_ingredientes pi ON p.id = pi.pizza_id
      LEFT JOIN ingredientes i ON pi.ingrediente_id = i.id
      WHERE p.id = $1
      GROUP BY p.id, c.nombre, c.icono
    `;

    const result = await query(sql, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Pizza con ID ${id} no encontrada`,
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(`Error al obtener la pizza con ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno al consultar la pizza',
      error: error.message,
    });
  }
};

/**
 * Crear una nueva pizza en la carta (con soporte para ingredientes)
 */
export const createPizza = async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre, descripcion, precio, imagen_url, categoria_id, ingredientes_ids } = req.body;

    if (!nombre || !precio) {
      return res.status(400).json({
        success: false,
        message: 'El nombre y el precio son campos obligatorios',
      });
    }

    await client.query('BEGIN');

    const sql = `
      INSERT INTO pizzas (nombre, descripcion, precio, imagen_url, categoria_id, disponible)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING *
    `;

    const result = await client.query(sql, [
      nombre,
      descripcion || '',
      parseFloat(precio),
      imagen_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      parseInt(categoria_id, 10) || 1,
    ]);

    const nuevaPizza = result.rows[0];

    // Asociar ingredientes si se han seleccionado
    if (ingredientes_ids && Array.isArray(ingredientes_ids) && ingredientes_ids.length > 0) {
      for (const ingId of ingredientes_ids) {
        await client.query(
          `INSERT INTO pizza_ingredientes (pizza_id, ingrediente_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [nuevaPizza.id, parseInt(ingId, 10)]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: '¡Pizza creada con éxito en la carta!',
      data: nuevaPizza,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear pizza:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al dar de alta la pizza',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/**
 * Modificar una pizza existente (nombre, precio, foto, ingredientes, disponibilidad)
 */
export const updatePizza = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, imagen_url, categoria_id, disponible, ingredientes_ids } = req.body;

    await client.query('BEGIN');

    // Comprobar si la pizza existe
    const checkRes = await client.query('SELECT * FROM pizzas WHERE id = $1', [id]);
    if (checkRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: `Pizza con ID ${id} no encontrada`,
      });
    }

    const current = checkRes.rows[0];

    const sql = `
      UPDATE pizzas 
      SET 
        nombre = $1,
        descripcion = $2,
        precio = $3,
        imagen_url = $4,
        categoria_id = $5,
        disponible = $6
      WHERE id = $7
      RETURNING *
    `;

    const result = await client.query(sql, [
      nombre !== undefined ? nombre : current.nombre,
      descripcion !== undefined ? descripcion : current.descripcion,
      precio !== undefined ? parseFloat(precio) : current.precio,
      imagen_url !== undefined ? imagen_url : current.imagen_url,
      categoria_id !== undefined ? parseInt(categoria_id, 10) : current.categoria_id,
      disponible !== undefined ? disponible : current.disponible,
      id
    ]);

    // Actualizar ingredientes si se proporciona la lista
    if (ingredientes_ids && Array.isArray(ingredientes_ids)) {
      await client.query('DELETE FROM pizza_ingredientes WHERE pizza_id = $1', [id]);
      for (const ingId of ingredientes_ids) {
        await client.query(
          `INSERT INTO pizza_ingredientes (pizza_id, ingrediente_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, parseInt(ingId, 10)]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Pizza #${id} actualizada con éxito`,
      data: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error al actualizar pizza #${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno al modificar la pizza',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/**
 * Eliminar una pizza de la carta
 */
export const deletePizza = async (req, res) => {
  try {
    const { id } = req.params;

    // Comprobar si tiene pedidos asociados
    const pedidosCheck = await query('SELECT id FROM lineas_pedido WHERE pizza_id = $1 LIMIT 1', [id]);
    
    if (pedidosCheck.rowCount > 0) {
      // Si ya tiene pedidos históricos, la marcamos como no disponible (soft delete) para proteger integridad
      await query('UPDATE pizzas SET disponible = FALSE WHERE id = $1', [id]);
      return res.json({
        success: true,
        message: `La pizza #${id} tiene pedidos históricos asociados, por lo que se ha marcado como no disponible (oculta en carta).`,
      });
    }

    const result = await query('DELETE FROM pizzas WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Pizza #${id} no encontrada`,
      });
    }

    res.json({
      success: true,
      message: `Pizza #${id} eliminada definitivamente de la carta`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(`Error al eliminar pizza #${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno al eliminar la pizza',
      error: error.message,
    });
  }
};

/**
 * Obtener listado de categorías e ingredientes para el formulario de administración
 */
export const getCatalogMetadata = async (req, res) => {
  try {
    const [categoriasRes, ingredientesRes] = await Promise.all([
      query('SELECT * FROM categorias ORDER BY id ASC'),
      query('SELECT * FROM ingredientes ORDER BY nombre ASC')
    ]);

    res.json({
      success: true,
      data: {
        categorias: categoriasRes.rows,
        ingredientes: ingredientesRes.rows
      }
    });
  } catch (error) {
    console.error('Error al obtener metadatos del catálogo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías e ingredientes',
      error: error.message,
    });
  }
};
