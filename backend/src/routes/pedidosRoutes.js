import { Router } from 'express';
import { 
  getAllPedidos, 
  getPedidoById, 
  createPedido, 
  updateEstadoPedido 
} from '../controllers/pedidosController.js';

const router = Router();

// Rutas para el recurso /api/pedidos
router.get('/', getAllPedidos);
router.get('/:id', getPedidoById);
router.post('/', createPedido);
router.put('/:id/estado', updateEstadoPedido);
router.patch('/:id/estado', updateEstadoPedido);
router.put('/:id', updateEstadoPedido);
router.patch('/:id', updateEstadoPedido);

export default router;
