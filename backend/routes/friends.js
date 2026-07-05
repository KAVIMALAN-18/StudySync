import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  sendRequest,
  getRequests,
  acceptRequest,
  declineRequest,
  removeFriend
} from '../controllers/friendController.js';

const router = express.Router();

router.post('/request', auth, sendRequest);
router.get('/requests', auth, getRequests);
router.post('/accept/:requestId', auth, acceptRequest);
router.post('/decline/:requestId', auth, declineRequest);
router.delete('/:friendId', auth, removeFriend);

export default router;
