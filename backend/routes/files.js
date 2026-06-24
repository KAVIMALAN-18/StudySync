import express from 'express';
import { auth } from '../middleware/auth.js';
import { uploadFile, getRoomFiles, downloadFile } from '../controllers/fileController.js';

const router = express.Router();

router.post('/:roomId/upload', auth, uploadFile);
router.get('/:roomId', auth, getRoomFiles);
router.get('/download/:fileId', auth, downloadFile);

export default router;
