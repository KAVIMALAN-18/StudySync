import Room from '../models/Room.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { inMemory } from '../utils/inMemoryStore.js';

export const createRoom = async (req, res) => {
  try {
    const { name, description, subject, studyDuration, isPrivate, capacity } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    // Generate unique 6-char room code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await Room.findOne({ code });
      if (!existing) isUnique = true;
    }

    const room = new Room({
      name,
      description,
      subject: subject || 'General Study',
      code,
      createdBy: userId,
      members: [userId],
      studyDuration,
      isPrivate: isPrivate || false,
      capacity: capacity || 10,
      startTime: new Date()
    });

    await room.save();
    await room.populate('createdBy', 'username avatar');
    await room.populate('members', 'username avatar');

    res.status(201).json({
      message: 'Room created successfully',
      data: room
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false, status: 'active' })
      .populate('createdBy', 'username avatar')
      .populate('members', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ data: rooms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyRooms = async (req, res) => {
  try {
    const userId = req.userId;

    const rooms = await Room.find({
      $or: [
        { createdBy: userId },
        { members: userId }
      ]
    })
      .populate('createdBy', 'username avatar')
      .populate('members', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({ data: rooms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRoomDetail = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId)
      .populate('createdBy', 'username avatar email')
      .populate('members', 'username avatar');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    res.json({
      data: room,
      messages: messages.reverse()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { 
      name, 
      description, 
      status, 
      studyDuration,
      subject,
      studyGoal,
      coverColor,
      coverIcon,
      isPrivate,
      isLocked,
      inviteOnly,
      allowChat,
      allowFileSharing,
      allowAIAssistant,
      autoStartBreak,
      autoStartFocus,
      breakDuration
    } = req.body;
    const userId = req.userId;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Only room creator can update' });
    }

    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    if (status) room.status = status;
    if (studyDuration) room.studyDuration = studyDuration;
    if (subject) room.subject = subject;
    if (studyGoal !== undefined) room.studyGoal = studyGoal;
    if (coverColor) room.coverColor = coverColor;
    if (coverIcon) room.coverIcon = coverIcon;
    if (isPrivate !== undefined) room.isPrivate = isPrivate;
    if (isLocked !== undefined) room.isLocked = isLocked;
    if (inviteOnly !== undefined) room.inviteOnly = inviteOnly;
    if (allowChat !== undefined) room.allowChat = allowChat;
    if (allowFileSharing !== undefined) room.allowFileSharing = allowFileSharing;
    if (allowAIAssistant !== undefined) room.allowAIAssistant = allowAIAssistant;
    if (autoStartBreak !== undefined) room.autoStartBreak = autoStartBreak;
    if (autoStartFocus !== undefined) room.autoStartFocus = autoStartFocus;
    if (breakDuration !== undefined) room.breakDuration = breakDuration;

    await room.save();
    await room.populate('createdBy', 'username avatar');
    await room.populate('members', 'username avatar');

    res.json({
      message: 'Room updated',
      data: room
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Only room creator can delete' });
    }

    await Room.findByIdAndDelete(roomId);
    await Message.deleteMany({ roomId });

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.members.includes(userId)) {
      return res.status(400).json({ error: 'Already in this room' });
    }

    if (room.isLocked) {
      return res.status(403).json({ error: 'Room is locked' });
    }

    if (room.members.length >= room.capacity) {
      return res.status(400).json({ error: 'Room is full' });
    }

    room.members.push(userId);
    await room.save();

    await room.populate('createdBy', 'username avatar');
    await room.populate('members', 'username avatar');

    const user = await User.findById(userId);
    await Message.create({
      roomId,
      senderId: userId,
      senderName: user.username,
      content: `${user.username} joined the room`,
      type: 'notification'
    });

    res.json({
      message: 'Joined room successfully',
      data: room
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const joinRoomByCode = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.userId;

    if (!code) {
      return res.status(400).json({ error: 'Room code is required' });
    }

    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({ error: 'Room not found with this code' });
    }

    if (room.members.includes(userId)) {
      return res.json({
        message: 'Already in this room',
        data: room
      });
    }

    if (room.isLocked) {
      return res.status(403).json({ error: 'Room is locked' });
    }

    if (room.members.length >= room.capacity) {
      return res.status(400).json({ error: 'Room is full' });
    }

    room.members.push(userId);
    await room.save();

    await room.populate('createdBy', 'username avatar');
    await room.populate('members', 'username avatar');

    const user = await User.findById(userId);
    await Message.create({
      roomId: room._id,
      senderId: userId,
      senderName: user.username,
      content: `${user.username} joined the room`,
      type: 'notification'
    });

    res.json({
      message: 'Joined room successfully',
      data: room
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    room.members = room.members.filter(m => m.toString() !== userId);
    await room.save();

    const user = await User.findById(userId);
    await Message.create({
      roomId,
      senderId: userId,
      senderName: user.username,
      content: `${user.username} left the room`,
      type: 'notification'
    });

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRoomMessages = async (req, res) => {
  const { roomId } = req.params;
  const { limit = 50, skip = 0 } = req.query;

  try {
    // Try MongoDB first
    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const ordered = messages.reverse();

    // Seed in-memory cache so socket broadcasts are consistent
    inMemory.seedFromDb(roomId, ordered);

    return res.json({ data: ordered });
  } catch (error) {
    // MongoDB unavailable — fall back to in-memory store
    console.warn(`[getRoomMessages] DB unavailable, serving from memory: ${error.message}`);
    const memMessages = inMemory.getMessages(roomId, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
    return res.json({ data: memMessages });
  }
};

export const promoteMember = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { targetUserId } = req.body;
    const userId = req.userId;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Only owner (createdBy) can promote others
    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Only the room owner can promote members to admin' });
    }

    if (!room.members.map(m => m.toString()).includes(targetUserId)) {
      return res.status(400).json({ error: 'Target user is not a member of this room' });
    }

    if (room.admins.map(a => a.toString()).includes(targetUserId)) {
      return res.status(400).json({ error: 'User is already an admin' });
    }

    room.admins.push(targetUserId);
    await room.save();

    res.json({ message: 'User promoted to admin successfully', data: room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const kickMember = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { targetUserId } = req.body;
    const userId = req.userId;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isOwner = room.createdBy.toString() === userId;
    const isAdmin = room.admins.map(a => a.toString()).includes(userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only owners and admins can kick members' });
    }

    // Owner cannot be kicked
    if (room.createdBy.toString() === targetUserId) {
      return res.status(403).json({ error: 'The room owner cannot be kicked' });
    }

    // Admin cannot kick another admin unless they are the owner
    const targetIsAdmin = room.admins.map(a => a.toString()).includes(targetUserId);
    if (targetIsAdmin && !isOwner) {
      return res.status(403).json({ error: 'Admins cannot kick other admins' });
    }

    // Remove member
    room.members = room.members.filter(m => m.toString() !== targetUserId);
    room.admins = room.admins.filter(a => a.toString() !== targetUserId);
    await room.save();

    res.json({ message: 'User kicked from room successfully', data: room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleLock = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isOwner = room.createdBy.toString() === userId;
    const isAdmin = room.admins.map(a => a.toString()).includes(userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only owners and admins can lock/unlock the room' });
    }

    room.isLocked = !room.isLocked;
    await room.save();

    res.json({ message: `Room ${room.isLocked ? 'locked' : 'unlocked'} successfully`, data: room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const demoteMember = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { targetUserId } = req.body;
    const userId = req.userId;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Only the room owner can demote admins' });
    }

    if (!room.admins.map(a => a.toString()).includes(targetUserId)) {
      return res.status(400).json({ error: 'User is not an admin' });
    }

    room.admins = room.admins.filter(a => a.toString() !== targetUserId);
    await room.save();

    res.json({ message: 'User demoted from admin successfully', data: room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const transferOwnership = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { targetUserId } = req.body;
    const userId = req.userId;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Only the room owner can transfer ownership' });
    }

    if (!room.members.map(m => m.toString()).includes(targetUserId)) {
      return res.status(400).json({ error: 'Target user must be a member of the room' });
    }

    room.createdBy = targetUserId;
    if (!room.admins.map(a => a.toString()).includes(userId)) {
      room.admins.push(userId);
    }
    await room.save();

    res.json({ message: 'Room ownership transferred successfully', data: room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRoomByCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ error: 'Room code is required' });
    }

    const room = await Room.findOne({ code: code.toUpperCase() })
      .populate('createdBy', 'username avatar')
      .populate('members', 'username avatar');

    if (!room) {
      return res.status(404).json({ error: 'Room not found with this code' });
    }

    res.json({ data: room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

