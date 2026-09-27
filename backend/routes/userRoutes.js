import express from 'express';
import {
  getUserProfile,
  updateProfile,
  uploadAvatarHandler,
  addUserSkill,
  removeUserSkill,
  saveExternalProfile,
  deleteExternalProfile
} from '../controllers/userController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';

const router = express.Router();

router.get('/:idOrUsername', optionalAuth, getUserProfile);
router.put('/profile', requireAuth, updateProfile);
router.post('/avatar', requireAuth, uploadAvatar.single('avatar'), uploadAvatarHandler);

router.post('/:id/skills', requireAuth, addUserSkill);
router.delete('/:id/skills/:skillId', requireAuth, removeUserSkill);

router.post('/:id/external', requireAuth, saveExternalProfile);
router.delete('/:id/external/:platform', requireAuth, deleteExternalProfile);

export default router;
