import express from 'express';
import { getBlockedUsers, blockUser, unblockUser } from '../controllers/blockController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getBlockedUsers);
router.post('/', requireAuth, blockUser);
router.delete('/:userId', requireAuth, unblockUser);

export default router;
