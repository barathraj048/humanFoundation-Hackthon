import { Router } from 'express';
import * as ctrl from '../controllers/public.controller';

const router = Router();

// No authentication required - public facing
router.get('/:slug/info', ctrl.getPublicInfo);
router.get('/:slug/availability', ctrl.getPublicAvailability);
router.post('/:slug/book', ctrl.publicBook);

export default router;
