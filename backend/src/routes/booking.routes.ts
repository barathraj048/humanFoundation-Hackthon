// ============================================================
// src/routes/booking.routes.ts
// ============================================================
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/booking.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getBookings);
router.get('/:id', ctrl.getBooking);
router.post('/', ctrl.createBooking);
router.put('/:id', ctrl.updateBooking);
router.put('/:id/status', ctrl.updateBookingStatus);
router.delete('/:id', ctrl.cancelBooking);

export default router;
