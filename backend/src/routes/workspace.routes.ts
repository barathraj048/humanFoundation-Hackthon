import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/workspace.controller';

const router = Router();
router.use(authenticate);

router.get('/me', ctrl.getWorkspace);
router.put('/:id', ctrl.updateWorkspace);
router.put('/:id/activate', ctrl.activateWorkspace);

// Service types
router.get('/:id/service-types', ctrl.getServiceTypes);
router.post('/:id/service-types', ctrl.createServiceType);
router.put('/:id/service-types/:stId', ctrl.updateServiceType);
router.delete('/:id/service-types/:stId', ctrl.deleteServiceType);

// Availability
router.get('/:id/availability', ctrl.getAvailability);
router.post('/:id/availability', ctrl.setAvailability);

// Integrations
router.get('/:id/integrations', ctrl.getIntegrations);
router.put('/:id/integrations', ctrl.upsertIntegration);

// Team
router.get('/:id/team', ctrl.getTeam);
router.post('/:id/invite', ctrl.inviteStaff);

export default router;
