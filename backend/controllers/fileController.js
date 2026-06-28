import File from '../models/File.js';
import Room from '../models/Room.js';

export const uploadFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, content, mimetype, size } = req.body;
    const userId = req.userId;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.members.map(m => m.toString()).includes(userId)) {
      return res.status(403).json({ error: 'You must be a member of the room to share files' });
    }

    if (!name || !content || !size) {
      return res.status(400).json({ error: 'Missing file fields' });
    }

    const newFile = new File({
      name,
      content,
      mimetype: mimetype || 'application/octet-stream',
      size,
      uploadedBy: userId,
      roomId
    });

    await newFile.save();
    await newFile.populate('uploadedBy', 'username');

    // Broadcast file sharing event to room members via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`room:${roomId}`).emit('file:shared', newFile);
    }

    res.status(201).json({ message: 'File shared successfully', data: newFile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRoomFiles = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.members.map(m => m.toString()).includes(userId)) {
      return res.status(403).json({ error: 'You must be a member of the room to view shared files' });
    }

    const files = await File.find({ roomId })
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ data: files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.userId;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const room = await Room.findById(file.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Associated room not found' });
    }

    // Access Control: check if user is a member of the room where file was shared
    if (!room.members.map(m => m.toString()).includes(userId)) {
      return res.status(403).json({ error: 'Access denied: you are not a member of this room' });
    }

    res.json({
      name: file.name,
      content: file.content,
      mimetype: file.mimetype
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
