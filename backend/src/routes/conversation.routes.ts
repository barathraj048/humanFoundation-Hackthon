import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/conversation.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getConversations);
router.get('/:id', ctrl.getConversation);
router.get('/:id/messages', ctrl.getMessages);
router.post('/:id/messages', ctrl.sendMessage);
router.put('/:id/tags', ctrl.updateTags);
router.put('/:id/status', ctrl.updateStatus);
router.put('/:id/resume-automation', ctrl.resumeAutomation);

export default router;
