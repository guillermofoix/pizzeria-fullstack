import { query } from '../config/db.js';

/**
 * Obtener el listado de todas las mesas con sus pedidos activos si los tuvieran
 */
export const getAllMesas = async (req, res) => {
  try {
    const sql = `
      SELECT 
        m.id,
        m.numero,
        m.capacidad,
        m.estado,
        COUNT(p.id) FILTER (WHERE p.estado IN ('pendiente', 'en_preparacion', 'listo')) AS pedidos_activos_count
      FROM mesas m
      LEFT JOIN pedidos p ON m.numero = p.mesa_numero
      GROUP BY m.id
      ORDER BY m.numero ASC
    `;

    const result = await query(sql);
    res.json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error al consultar mesas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al consultar las mesas de la pizzería',
      error: error.message,
    });
  }
};

/**
 * Obtener información de una mesa específica por su número (para la app QR)
 */
export const getMesaByNumero = async (req, res) => {
  try {
    const { numero } = req.params;

    const sql = `
      SELECT id, numero, capacidad, estado
      FROM mesas
      WHERE numero = $1
    `;

    const result = await query(sql, [parseInt(numero, 10)]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Mesa número ${numero} no existe en la sala`,
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(`Error al consultar mesa #${req.params.numero}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error al consultar la mesa',
      error: error.message,
    });
  }
};

/**
 * Actualizar el estado de una mesa ('libre', 'ocupada', 'reservada')
 */
export const updateEstadoMesa = async (req, res) => {
  try {
    const { numero } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['libre', 'ocupada', 'cuenta_pedida', 'reservada'];
    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado no válido. Opciones permitidas: ${estadosValidos.join(', ')}`,
      });
    }

    const sql = `
      UPDATE mesas
      SET estado = $1
      WHERE numero = $2
      RETURNING *
    `;

    const result = await query(sql, [estado, parseInt(numero, 10)]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Mesa número ${numero} no encontrada`,
      });
    }

    res.json({
      success: true,
      message: `Mesa #${numero} actualizada a '${estado}'`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(`Error al actualizar estado de la mesa #${req.params.numero}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno al actualizar estado de la mesa',
      error: error.message,
    });
  }
};
