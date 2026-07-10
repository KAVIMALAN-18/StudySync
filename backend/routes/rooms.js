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
  joinRoomByCode,
  leaveRoom,
  getRoomMessages,
  promoteMember,
  kickMember,
  toggleLock,
  demoteMember,
  transferOwnership,
  getRoomByCode
} from '../controllers/roomController.js';

const router = express.Router();

router.post('/', auth, createRoom);
router.get('/', getAllRooms);
router.get('/my-rooms', auth, getMyRooms);
router.get('/code/:code', auth, getRoomByCode); // preview room details by code
router.get('/:roomId', getRoomDetail);
router.patch('/:roomId', auth, updateRoom);
router.delete('/:roomId', auth, deleteRoom);
router.post('/join-by-code', auth, joinRoomByCode);
router.post('/:roomId/join', auth, joinRoom);
router.post('/:roomId/leave', auth, leaveRoom);
router.get('/:roomId/messages', getRoomMessages);
router.patch('/:roomId/promote', auth, promoteMember);
router.patch('/:roomId/demote', auth, demoteMember);
router.post('/:roomId/kick', auth, kickMember);
router.patch('/:roomId/lock', auth, toggleLock);
router.patch('/:roomId/transfer-ownership', auth, transferOwnership);

export default router;

