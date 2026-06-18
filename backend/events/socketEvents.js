import User from '../models/User.js';
import Message from '../models/Message.js';
import Room from '../models/Room.js';

const userSocketMap = new Map();
const roomSocketMap = new Map();
const roomTimers = new Map(); // Store timer state per room

// Helper function to get current timer state
const getTimerState = (roomId) => {
  if (!roomTimers.has(roomId)) {
    return null;
  }
  
  const timer = roomTimers.get(roomId);
  let timeLeft = timer.timeLeft;
  
  // If timer is running, calculate elapsed time
  if (timer.status === 'running') {
    const elapsed = (Date.now() - timer.startTime) / 1000;
    timeLeft = Math.max(0, timer.initialTimeLeft - elapsed);
    
    // Auto-switch mode when time runs out
    if (timeLeft <= 0) {
      timer.status = 'paused';
      timer.timeLeft = 0;
    }
  }
  
  return {
    timeLeft,
    status: timer.status,
    mode: timer.mode,
    initialTimeLeft: timer.initialTimeLeft,
    lastUpdated: timer.lastUpdated
  };
};

// Helper function to initialize timer for a room
const initializeRoomTimer = (roomId, duration, mode = 'focus') => {
  roomTimers.set(roomId, {
    timeLeft: duration,
    initialTimeLeft: duration,
    status: 'paused',
    mode: mode,
    startTime: Date.now(),
    lastUpdated: new Date()
  });
};

export const setupSocketEvents = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user:online', async (data) => {
      try {
        const { userId, username, avatar } = data;

        userSocketMap.set(userId, socket.id);
        socket.userId = userId;

        await User.findByIdAndUpdate(userId, { isOnline: true });

        const onlineUsers = await User.find({ isOnline: true })
          .select('_id username avatar bio currentRoomId')
          .lean();

        io.emit('users:list', onlineUsers);
        console.log(`${username} is online`);
      } catch (error) {
        console.error('Error in user:online:', error);
      }
    });

    socket.on('room:join', async (data) => {
      try {
        const { roomId, userId } = data;

        socket.join(`room:${roomId}`);

        if (!roomSocketMap.has(roomId)) {
          roomSocketMap.set(roomId, new Set());
        }
        roomSocketMap.get(roomId).add(socket.id);

        // Initialize timer for this room if it doesn't exist
        if (!roomTimers.has(roomId)) {
          const room = await Room.findById(roomId).lean();
          initializeRoomTimer(roomId, (room?.studyDuration || 30) * 60, 'focus');
        }

        await User.findByIdAndUpdate(userId, { currentRoomId: roomId });

        const room = await Room.findById(roomId)
          .populate('members', 'username avatar')
          .lean();

        // Send current timer state to the joining user
        const timerState = getTimerState(roomId);
        socket.emit('timer:sync', {
          roomId,
          ...timerState
        });

        io.to(`room:${roomId}`).emit('room:members-updated', {
          roomId,
          members: room.members,
          totalMembers: room.members.length
        });

        console.log(`User ${userId} joined room ${roomId}`);
      } catch (error) {
        console.error('Error in room:join:', error);
      }
    });

    socket.on('room:leave', async (data) => {
      try {
        const { roomId, userId } = data;

        socket.leave(`room:${roomId}`);

        if (roomSocketMap.has(roomId)) {
          roomSocketMap.get(roomId).delete(socket.id);
        }

        await User.findByIdAndUpdate(userId, { currentRoomId: null });

        const room = await Room.findById(roomId)
          .populate('members', 'username avatar')
          .lean();

        io.to(`room:${roomId}`).emit('room:members-updated', {
          roomId,
          members: room.members,
          totalMembers: room.members.length
        });

        console.log(`User ${userId} left room ${roomId}`);
      } catch (error) {
        console.error('Error in room:leave:', error);
      }
    });

    socket.on('chat:message', async (data) => {
      try {
        const { roomId, userId, senderName, content } = data;

        const message = await Message.create({
          roomId,
          senderId: userId,
          senderName,
          content,
          type: 'message'
        });

        io.to(`room:${roomId}`).emit('chat:message', {
          _id: message._id,
          roomId,
          senderId: userId,
          senderName,
          content,
          timestamp: message.timestamp,
          type: 'message'
        });

        console.log(`Message in room ${roomId}: ${senderName}: ${content}`);
      } catch (error) {
        console.error('Error in chat:message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('timer:start', (data) => {
      try {
        const { roomId, duration, mode } = data;

        // Update room timer state
        if (!roomTimers.has(roomId)) {
          initializeRoomTimer(roomId, duration, mode);
        } else {
          const timer = roomTimers.get(roomId);
          timer.status = 'running';
          timer.startTime = Date.now();
          timer.timeLeft = duration;
          timer.initialTimeLeft = duration;
          timer.mode = mode;
          timer.lastUpdated = new Date();
        }

        const timerState = getTimerState(roomId);
        io.to(`room:${roomId}`).emit('timer:sync', {
          roomId,
          ...timerState,
          action: 'started'
        });

        console.log(`Timer started in room ${roomId}: ${duration}s, mode: ${mode}`);
      } catch (error) {
        console.error('Error in timer:start:', error);
      }
    });

    socket.on('timer:pause', (data) => {
      try {
        const { roomId } = data;

        if (roomTimers.has(roomId)) {
          const timer = roomTimers.get(roomId);
          const timerState = getTimerState(roomId);
          timer.status = 'paused';
          timer.timeLeft = timerState.timeLeft;
          timer.lastUpdated = new Date();
        }

        const timerState = getTimerState(roomId);
        io.to(`room:${roomId}`).emit('timer:sync', {
          roomId,
          ...timerState,
          action: 'paused'
        });

        console.log(`Timer paused in room ${roomId}`);
      } catch (error) {
        console.error('Error in timer:pause:', error);
      }
    });

    socket.on('timer:reset', (data) => {
      try {
        const { roomId, duration, mode = 'focus' } = data;

        // Reset timer state
        initializeRoomTimer(roomId, duration || (30 * 60), mode);

        const timerState = getTimerState(roomId);
        io.to(`room:${roomId}`).emit('timer:sync', {
          roomId,
          ...timerState,
          action: 'reset'
        });

        console.log(`Timer reset in room ${roomId}`);
      } catch (error) {
        console.error('Error in timer:reset:', error);
      }
    });

    socket.on('timer:switch-mode', (data) => {
      try {
        const { roomId, mode, duration } = data;

        if (roomTimers.has(roomId)) {
          const timer = roomTimers.get(roomId);
          timer.mode = mode;
          timer.status = 'paused';
          timer.timeLeft = duration;
          timer.initialTimeLeft = duration;
          timer.lastUpdated = new Date();
        } else {
          initializeRoomTimer(roomId, duration, mode);
        }

        const timerState = getTimerState(roomId);
        io.to(`room:${roomId}`).emit('timer:sync', {
          roomId,
          ...timerState,
          action: 'mode-switched'
        });

        console.log(`Timer mode switched in room ${roomId} to ${mode}`);
      } catch (error) {
        console.error('Error in timer:switch-mode:', error);
      }
    });

    socket.on('timer:state-request', (data) => {
      try {
        const { roomId } = data;

        const timerState = getTimerState(roomId);
        socket.emit('timer:sync', {
          roomId,
          ...timerState
        });
      } catch (error) {
        console.error('Error in timer:state-request:', error);
      }
    });

    socket.on('room:invite', async (data) => {
      try {
        const { roomId, recipientUserId } = data;

        const recipientSocketId = userSocketMap.get(recipientUserId);

        if (recipientSocketId) {
          const room = await Room.findById(roomId)
            .select('name description studyDuration')
            .lean();

          io.to(recipientSocketId).emit('room:invite-received', {
            roomId,
            room
          });

          console.log(`Invite sent to user ${recipientUserId} for room ${roomId}`);
        }
      } catch (error) {
        console.error('Error in room:invite:', error);
      }
    });

    socket.on('disconnect', async () => {
      try {
        const userId = socket.userId;

        if (userId) {
          userSocketMap.delete(userId);
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            currentRoomId: null
          });

          const onlineUsers = await User.find({ isOnline: true })
            .select('_id username avatar bio')
            .lean();

          io.emit('users:list', onlineUsers);
          console.log('User disconnected:', userId);
        }
      } catch (error) {
        console.error('Error in disconnect:', error);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

export const getActiveUsers = () => Array.from(userSocketMap.keys());
export const getActiveRooms = () => Array.from(roomSocketMap.keys());
