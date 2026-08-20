import { Router } from 'express';
import { 
  getAllPizzas, 
  getPizzaById, 
  createPizza,
  updatePizza,
  deletePizza,
  getCatalogMetadata
} from '../controllers/pizzasController.js';

const router = Router();

// Rutas para el recurso /api/pizzas
// NOTA DIDÁCTICA: /metadata debe ir ANTES de /:id para que Express no confunda la palabra "metadata" con un ID numérico
router.get('/metadata', getCatalogMetadata);
router.get('/', getAllPizzas);
router.get('/:id', getPizzaById);
router.post('/', createPizza);
router.put('/:id', updatePizza);
router.delete('/:id', deletePizza);

export default router;
