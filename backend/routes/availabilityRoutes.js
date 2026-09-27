import express from 'express';
import { getAvailability, addAvailabilitySlot, deleteAvailabilitySlot } from '../controllers/availabilityController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getAvailability);
router.post('/', requireAuth, addAvailabilitySlot);
router.delete('/:id', requireAuth, deleteAvailabilitySlot);

export default router;
