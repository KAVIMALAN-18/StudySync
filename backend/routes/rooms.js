import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  createRoom,
  getAllRooms,
  getMyRooms,
  getRoomDetail,
  updateRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
  getRoomMessages,
  promoteMember,
  kickMember,
  toggleLock
} from '../controllers/roomController.js';

const router = express.Router();

router.post('/', auth, createRoom);
router.get('/', getAllRooms);
router.get('/my-rooms', auth, getMyRooms);
router.get('/:roomId', getRoomDetail);
router.patch('/:roomId', auth, updateRoom);
router.delete('/:roomId', auth, deleteRoom);
router.post('/:roomId/join', auth, joinRoom);
router.post('/:roomId/leave', auth, leaveRoom);
router.get('/:roomId/messages', getRoomMessages);
router.patch('/:roomId/promote', auth, promoteMember);
router.post('/:roomId/kick', auth, kickMember);
router.patch('/:roomId/lock', auth, toggleLock);

export default router;
