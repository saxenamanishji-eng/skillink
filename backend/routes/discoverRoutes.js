import express from 'express';
import { discoverUsers } from '../controllers/discoverController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, discoverUsers);

export default router;
