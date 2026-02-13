import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/contact.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getContacts);
router.get('/:id', ctrl.getContact);
router.post('/', ctrl.createContact);
router.put('/:id', ctrl.updateContact);
router.delete('/:id', ctrl.deleteContact);

export default router;
