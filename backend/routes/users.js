import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  getOnlineUsers,
  getUserProfile,
  updateProfile,
  getFriends,
  searchUsers
} from '../controllers/userController.js';

const router = express.Router();

router.get('/online', getOnlineUsers);
router.get('/search', auth, searchUsers);
router.get('/profile/:userId', getUserProfile);
router.patch('/profile', auth, updateProfile);
router.get('/friends', auth, getFriends);

export default router;
