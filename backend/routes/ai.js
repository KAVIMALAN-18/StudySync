import express from 'express';
import { auth } from '../middleware/auth.js';
import { askGemini } from '../controllers/AIController.js';

const router = express.Router();

router.post('/chat', auth, askGemini);

export default router;
