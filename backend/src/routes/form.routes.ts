import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/form.controller';

const router = Router();

// ── Public routes (no auth) — contact fills form from email link ──────────────
router.get('/public/:id',  ctrl.getPublicSubmission);
router.post('/public/:id', ctrl.submitPublicForm);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.use(authenticate);

router.get('/templates',          ctrl.getTemplates);
router.post('/templates',         ctrl.createTemplate);
router.put('/templates/:id',      ctrl.updateTemplate);
router.delete('/templates/:id',   ctrl.deleteTemplate);

router.get('/submissions',         ctrl.getSubmissions);
router.post('/submissions',        ctrl.createSubmission);
router.get('/submissions/:id',     ctrl.getSubmission);
router.put('/submissions/:id/complete', ctrl.completeSubmission);

export default router;
