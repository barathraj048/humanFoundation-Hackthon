import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/automation.controller';

const router = Router();
router.use(authenticate);

router.get('/rules', ctrl.getRules);
router.post('/rules', ctrl.createRule);
router.put('/rules/:id', ctrl.updateRule);
router.delete('/rules/:id', ctrl.deleteRule);
router.get('/logs', ctrl.getLogs);

export default router;
