import express from 'express';
import { getSkills, createSkill } from '../controllers/skillController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getSkills);
router.post('/', requireAuth, createSkill);

export default router;
