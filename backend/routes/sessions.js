import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  getSessionHistory,
  getSessionStats,
  getRoomStats
} from '../controllers/sessionController.js';

const router = express.Router();

router.get('/history', auth, getSessionHistory);
router.get('/stats', auth, getSessionStats);
router.get('/room/:roomId', getRoomStats);

export default router;
