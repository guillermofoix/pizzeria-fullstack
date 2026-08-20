import { Router } from 'express';
import { getAllMesas, getMesaByNumero, updateEstadoMesa } from '../controllers/mesasController.js';

const router = Router();

// Rutas para el recurso /api/mesas
router.get('/', getAllMesas);
router.get('/:numero', getMesaByNumero);
router.patch('/:numero/estado', updateEstadoMesa);

export default router;
