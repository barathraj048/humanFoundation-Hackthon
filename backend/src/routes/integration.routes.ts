import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/integration.controller';

const router = Router();

// Google callback is public (no auth, uses state param)
router.get('/google/callback', ctrl.googleCallback);

// All other routes require authentication
router.use(authenticate);

router.get('/status', ctrl.getIntegrationStatus);
router.post('/email/test', ctrl.testEmailIntegration);
router.get('/google/auth-url', ctrl.getGoogleAuthUrl);
router.delete('/:type', ctrl.disconnectIntegration);

export default router;
