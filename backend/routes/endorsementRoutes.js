import express from 'express';
import { getEndorsements, createEndorsement } from '../controllers/endorsementController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getEndorsements);
router.post('/', requireAuth, createEndorsement);

export default router;
