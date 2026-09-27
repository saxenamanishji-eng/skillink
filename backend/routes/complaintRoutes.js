import express from 'express';
import { getComplaints, getComplaintById, createComplaint } from '../controllers/complaintController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getComplaints);
router.get('/:id', requireAuth, getComplaintById);
router.post('/', requireAuth, createComplaint);

export default router;
