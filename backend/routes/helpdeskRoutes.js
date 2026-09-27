import express from 'express';
import {
  getCategories,
  getTickets,
  getTicketById,
  createTicket,
  replyTicket,
  downloadAttachment
} from '../controllers/helpdeskController.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadAttachment } from '../middleware/upload.js';

const router = express.Router();

router.get('/categories', getCategories);
router.get('/tickets', requireAuth, getTickets);
router.get('/tickets/:id', requireAuth, getTicketById);
router.post('/tickets', requireAuth, uploadAttachment.single('attachment'), createTicket);
router.post('/tickets/:id/messages', requireAuth, replyTicket);
router.get('/attachments/:id', requireAuth, downloadAttachment);

export default router;
