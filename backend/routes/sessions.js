import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  getSessionHistory,
  getSessionStats,
  getRoomStats,
  getWeeklyProgress
} from '../controllers/sessionController.js';

const router = express.Router();

router.get('/history', auth, getSessionHistory);
router.get('/stats', auth, getSessionStats);
router.get('/weekly', auth, getWeeklyProgress);
router.get('/room/:roomId', getRoomStats);

export default router;
