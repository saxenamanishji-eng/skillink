import express from 'express';
import { createReview } from '../controllers/reviewController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, createReview);

export default router;
