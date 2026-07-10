import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  getOnlineUsers,
  getUserProfile,
  updateProfile,
  getFriends,
  searchUsers,
  updateSettings,
  deleteAccount
} from '../controllers/userController.js';

const router = express.Router();

router.get('/online', getOnlineUsers);
router.get('/search', auth, searchUsers);
router.get('/profile/:userId', getUserProfile);
router.patch('/profile', auth, updateProfile);
router.patch('/settings', auth, updateSettings);
router.delete('/account', auth, deleteAccount);
router.get('/friends', auth, getFriends);

export default router;

