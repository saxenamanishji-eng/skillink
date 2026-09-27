import express from 'express';
import {
  getConnections,
  sendConnectionRequest,
  respondToConnection,
  removeConnection
} from '../controllers/connectionController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getConnections);
router.post('/', requireAuth, sendConnectionRequest);
router.put('/:id', requireAuth, respondToConnection);
router.delete('/:id', requireAuth, removeConnection);

export default router;
