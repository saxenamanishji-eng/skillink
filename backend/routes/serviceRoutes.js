import express from 'express';
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} from '../controllers/serviceController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getServices);
router.get('/:id', optionalAuth, getServiceById);
router.post('/', requireAuth, createService);
router.put('/:id', requireAuth, updateService);
router.delete('/:id', requireAuth, deleteService);

export default router;
