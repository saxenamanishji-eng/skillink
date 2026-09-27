import express from 'express';
import {
  getBookings,
  getBookingById,
  createBooking,
  respondToBooking,
  cancelBooking,
  completeBooking
} from '../controllers/bookingController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getBookings);
router.get('/:id', requireAuth, getBookingById);
router.post('/', requireAuth, createBooking);
router.put('/:id/respond', requireAuth, respondToBooking);
router.put('/:id/cancel', requireAuth, cancelBooking);
router.put('/:id/complete', requireAuth, completeBooking);

export default router;
