import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getOverview, getBookingTrend, getAnalytics } from '../controllers/dashboard.controller';

const router = Router();
router.use(authenticate);

router.get('/overview', getOverview);
router.get('/analytics', getAnalytics);
router.get('/booking-trend', getBookingTrend);

export default router;
