import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/inventory.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getInventory);
router.get('/alerts', ctrl.getInventoryAlerts);
router.get('/:id', ctrl.getInventoryItem);
router.post('/', ctrl.createInventoryItem);
router.put('/:id', ctrl.updateInventoryItem);
router.delete('/:id', ctrl.deleteInventoryItem);

export default router;
