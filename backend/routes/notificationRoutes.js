import express from 'express';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getNotifications);
router.put('/:id/read', requireAuth, markNotificationRead);
router.put('/read-all', requireAuth, markAllNotificationsRead);

export default router;
