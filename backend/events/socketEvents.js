import User from '../models/User.js';
import Message from '../models/Message.js';
import Room from '../models/Room.js';
import { inMemory } from '../utils/inMemoryStore.js';
import { recordSession } from '../controllers/sessionController.js';

// Multi-tab and user tracking state
const userSockets = new Map(); // userId -> Set of socket.ids
const disconnectTimeouts = new Map(); // userId -> setTimeout ID

const roomSocketMap = new Map(); // roomId -> Set of socket.ids
const roomTimers = new Map(); // Store timer state per room
const roomIntervals = new Map(); // Store active intervals per room: roomId -> setInterval ID

// Helper function to get all user IDs connected to a room
const getRoomUserIds = (io, roomId) => {
  const userIds = new Set();
  const socketIds = roomSocketMap.get(roomId);
  if (socketIds) {
    for (const socketId of socketIds) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.userId) {
        userIds.add(socket.userId);
      }
    }
  }
  return Array.from(userIds);
};

// Helper function to send and persist a system notification
const sendRoomNotification = async (io, roomId, content) => {
  const notif = inMemory.addMessage(roomId, {
    senderId: 'system',
    senderName: 'System',
    content,
    type: 'notification'
  });
  io.to(`room:${roomId}`).emit('message:receive', notif);
  io.to(`room:${roomId}`).emit('chat:message', notif);

  try {
    await Message.create({
      roomId,
      senderId: null,
      senderName: 'System',
      content,
      type: 'notification'
    });
  } catch (err) {
    console.warn(`[SocketEvents] Failed to persist system notification: ${err.message}`);
  }
};

// Helper function to get current timer state
const getTimerState = (roomId) => {
  if (!roomTimers.has(roomId)) {
    return null;
  }
  
  const timer = roomTimers.get(roomId);
  return {
    timeLeft: timer.timeLeft,
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
    lastUpdated: new Date()
  });
};

// Start the server-side countdown interval for a room
const startRoomTimerInterval = (io, roomId) => {
  if (roomIntervals.has(roomId)) {
    clearInterval(roomIntervals.get(roomId));
  }

  const intervalId = setInterval(async () => {
    try {
      const timer = roomTimers.get(roomId);
      if (!timer || timer.status !== 'running') {
        clearInterval(intervalId);
        roomIntervals.delete(roomId);
        return;
      }

      timer.timeLeft = Math.max(0, timer.timeLeft - 1);
      timer.lastUpdated = new Date();

      // Track active focus/break minutes every 60 seconds
      timer.secondsElapsed = (timer.secondsElapsed || 0) + 1;
      if (timer.secondsElapsed >= 60) {
        timer.secondsElapsed = 0;
        const userIds = getRoomUserIds(io, roomId);
        const focusMinutes = timer.mode === 'focus' ? 1 : 0;
        const breakMinutes = timer.mode === 'break' ? 1 : 0;
        for (const userId of userIds) {
          recordSession(userId, roomId, { focusMinutes, breakMinutes }).catch(err => {
            console.error(`[Session] Failed to record minutes for user ${userId}:`, err.message);
          });
        }
      }

      if (timer.timeLeft <= 0) {
        clearInterval(intervalId);
        roomIntervals.delete(roomId);

        timer.status = 'paused';

        // Auto-switch mode
        if (timer.mode === 'focus') {
          // Completed focus session!
          // Increment completed Pomodoro cycles for all users in the room
          const userIds = getRoomUserIds(io, roomId);
          for (const userId of userIds) {
            recordSession(userId, roomId, { incrementPomodoro: true }).catch(err => {
              console.error(`[Session] Failed to record Pomodoro for user ${userId}:`, err.message);
            });
          }

          await sendRoomNotification(io, roomId, 'Focus session finished! Time for a break.');

          timer.mode = 'break';
          timer.timeLeft = 5 * 60; // 5 minutes Break
          timer.initialTimeLeft = 5 * 60;
        } else {
          await sendRoomNotification(io, roomId, 'Break session finished! Time to focus.');

          timer.mode = 'focus';
          const roomObj = await Room.findById(roomId).lean();
          const focusMinutes = roomObj?.studyDuration || 30;
          timer.timeLeft = focusMinutes * 60;
          timer.initialTimeLeft = focusMinutes * 60;
        }

        io.to(`room:${roomId}`).emit('timer:sync', {
          roomId,
          ...timer,
          action: 'mode-switched'
        });

        console.log(`[Timer] Auto-switched mode in room ${roomId} to ${timer.mode}`);
      } else {
        // Broadcast periodic tick update
        io.to(`room:${roomId}`).emit('timer:update', {
          roomId,
          timeLeft: timer.timeLeft,
          status: 'running',
          mode: timer.mode,
          initialTimeLeft: timer.initialTimeLeft
        });
      }
    } catch (err) {
      console.error(`Error in timer interval for room ${roomId}:`, err);
    }
  }, 1000);

  roomIntervals.set(roomId, intervalId);
};

export const setupSocketEvents = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user:online', async (data) => {
      try {
        const { userId, username, avatar } = data;

        socket.userId = userId;

        // Clear any disconnect timeout for this user (they reconnected!)
        if (disconnectTimeouts.has(userId)) {
          clearTimeout(disconnectTimeouts.get(userId));
          disconnectTimeouts.delete(userId);
          console.log(`[Presence] Cancelled offline timeout for user: ${username} (${userId})`);
        }

        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);

        await User.findByIdAndUpdate(userId, { isOnline: true });

        const onlineUsers = await User.find({ isOnline: true })
          .select('_id username avatar bio currentRoomId')
          .lean();

        io.emit('users:list', onlineUsers);
        console.log(`[Presence] ${username} is online (sockets count: ${userSockets.get(userId).size})`);
      } catch (error) {
        console.error('Error in user:online:', error);
      }
    });

    socket.on('room:join', async (data) => {
      try {
        const { roomId, userId } = data;

        socket.join(`room:${roomId}`);
        socket.roomId = roomId;

        let isAlreadyInRoom = false;
        const existingSockets = roomSocketMap.get(roomId);
        if (existingSockets) {
          for (const sId of existingSockets) {
            const s = io.sockets.sockets.get(sId);
            if (s && s.userId === userId) {
              isAlreadyInRoom = true;
              break;
            }
          }
        }

        if (!roomSocketMap.has(roomId)) {
          roomSocketMap.set(roomId, new Set());
        }
        roomSocketMap.get(roomId).add(socket.id);

        // Send existing chat history from in-memory to this socket immediately
        const chatHistory = inMemory.getMessages(roomId, { limit: 50 });
        if (chatHistory.length > 0) {
          socket.emit('chat:history', { roomId, messages: chatHistory });
        }

        // Best-effort DB operations (graceful on failure)
        let user = null;
        let roomObj = null;
        try {
          user = await User.findById(userId);
          roomObj = await Room.findById(roomId);
        } catch (dbErr) {
          console.warn(`[Room:join] DB lookup failed: ${dbErr.message}`);
        }

        if (user && roomObj) {
          if (!roomObj.members.map(m => m.toString()).includes(userId)) {
            try {
              roomObj.members.push(userId);
              await roomObj.save();
            } catch (e) { /* silent */ }
          }

          if (!isAlreadyInRoom) {
            // Store join notification in-memory + async DB
            await sendRoomNotification(io, roomId, `${user.username} joined the room`);
          }
        }

        if (user) {
          User.findByIdAndUpdate(userId, { currentRoomId: roomId }).catch(() => {});
        }

        // Initialize timer for this room if it doesn't exist
        if (!roomTimers.has(roomId)) {
          const defaultDuration = (roomObj?.studyDuration || 30) * 60;
          initializeRoomTimer(roomId, defaultDuration, 'focus');
        }

        // Send current timer state to the joining user
        const timerState = getTimerState(roomId);
        socket.emit('timer:sync', { roomId, ...timerState });

        // Fetch and broadcast updated members list
        let members = [];
        try {
          const room = await Room.findById(roomId).populate('members', 'username avatar').lean();
          members = room ? room.members : [];
        } catch (e) { /* silent */ }

        io.to(`room:${roomId}`).emit('room:members-updated', {
          roomId,
          members,
          totalMembers: members.length
        });

        console.log(`[Room] User ${userId} joined room ${roomId}`);
      } catch (error) {
        console.error('Error in room:join:', error);
      }
    });

    socket.on('room:leave', async (data) => {
      try {
        const { roomId, userId } = data;

        socket.leave(`room:${roomId}`);
        socket.roomId = null;

        if (roomSocketMap.has(roomId)) {
          roomSocketMap.get(roomId).delete(socket.id);
          if (roomSocketMap.get(roomId).size === 0) {
            if (roomIntervals.has(roomId)) {
              clearInterval(roomIntervals.get(roomId));
              roomIntervals.delete(roomId);
              console.log(`[Timer] Room ${roomId} is empty. Stopped timer interval.`);
            }
          }
        }

        // Best-effort DB operations
        let user = null;
        try {
          const roomObj = await Room.findById(roomId);
          if (roomObj) {
            roomObj.members = roomObj.members.filter(m => m.toString() !== userId);
            await roomObj.save();
          }
          user = await User.findById(userId);
          User.findByIdAndUpdate(userId, { currentRoomId: null }).catch(() => {});
        } catch (dbErr) {
          console.warn(`[Room:leave] DB update failed: ${dbErr.message}`);
        }

        // Store leave notification in-memory + async DB
        const senderName = user?.username || 'Someone';
        await sendRoomNotification(io, roomId, `${senderName} left the room`);

        // Broadcast updated members
        let members = [];
        try {
          const room = await Room.findById(roomId).populate('members', 'username avatar').lean();
          members = room ? room.members : [];
        } catch (e) { /* silent */ }

        io.to(`room:${roomId}`).emit('room:members-updated', {
          roomId,
          members,
          totalMembers: members.length
        });

        console.log(`[Room] User ${userId} left room ${roomId}`);
      } catch (error) {
        console.error('Error in room:leave:', error);
      }
    });

    // Helper: persist a chat message (in-memory primary + MongoDB fallback)
    const persistAndBroadcast = async ({ roomId, userId, senderName, content, eventName }) => {
      if (!roomId || !userId || !content?.trim()) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      // Always store in-memory first (works without DB)
      const memMsg = inMemory.addMessage(roomId, {
        senderId: userId,
        senderName,
        content: content.trim(),
        type: 'message'
      });

      const payload = { ...memMsg };

      // Broadcast immediately — don't wait for DB
      io.to(`room:${roomId}`).emit('message:receive', payload);
      io.to(`room:${roomId}`).emit('chat:message', payload);

      console.log(`[Chat] ${eventName} in room ${roomId}: ${senderName}: ${content}`);

      // Async persist to MongoDB (best-effort, silent on failure)
      Message.create({
        roomId,
        senderId: userId,
        senderName,
        content: content.trim(),
        type: 'message'
      }).then(dbMsg => {
        // Update in-memory id to DB id so history loads consistently
        memMsg._id = dbMsg._id;
      }).catch(err => {
        console.warn(`[Chat] MongoDB persist failed (in-memory only): ${err.message}`);
      });
    };

    // Primary chat handler - new standard event
    socket.on('message:send', (data) => {
      persistAndBroadcast({ ...data, eventName: 'message:send' }).catch(err => {
        console.error('Error in message:send:', err);
        socket.emit('error', { message: 'Failed to send message' });
      });
    });

    // Legacy handler - kept for backward compatibility
    socket.on('chat:message', (data) => {
      persistAndBroadcast({ ...data, eventName: 'chat:message' }).catch(err => {
        console.error('Error in chat:message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      });
    });

    socket.on('timer:start', async (data) => {
      try {
        const { roomId, duration, mode } = data;

        let timer = roomTimers.get(roomId);
        if (!timer) {
          timer = {
            timeLeft: duration,
            initialTimeLeft: duration,
            status: 'running',
            mode: mode || 'focus',
            lastUpdated: new Date()
          };
          roomTimers.set(roomId, timer);
        } else {
          timer.status = 'running';
          timer.timeLeft = duration;
          timer.initialTimeLeft = duration;
          timer.mode = mode || timer.mode;
          timer.lastUpdated = new Date();
        }

        startRoomTimerInterval(io, roomId);

        io.to(`room:${roomId}`).emit('timer:sync', {
          roomId,
          ...timer,
          action: 'started'
        });

        await sendRoomNotification(io, roomId, `${timer.mode === 'focus' ? 'Focus' : 'Break'} session started.`);

        console.log(`[Timer] Started in room ${roomId}: ${duration}s, mode: ${timer.mode}`);
      } catch (error) {
        console.error('Error in timer:start:', error);
      }
    });

    socket.on('timer:pause', async (data) => {
      try {
        const { roomId } = data;

        const timer = roomTimers.get(roomId);
        if (timer) {
          timer.status = 'paused';
          timer.lastUpdated = new Date();

          if (roomIntervals.has(roomId)) {
            clearInterval(roomIntervals.get(roomId));
            roomIntervals.delete(roomId);
          }

          io.to(`room:${roomId}`).emit('timer:sync', {
            roomId,
            ...timer,
            action: 'paused'
          });

          await sendRoomNotification(io, roomId, 'Study timer paused.');

          console.log(`[Timer] Paused in room ${roomId}`);
        }
      } catch (error) {
        console.error('Error in timer:pause:', error);
      }
    });

    socket.on('timer:reset', async (data) => {
      try {
        const { roomId, duration, mode } = data;

        if (roomIntervals.has(roomId)) {
          clearInterval(roomIntervals.get(roomId));
          roomIntervals.delete(roomId);
        }

        const targetDuration = duration || 30 * 60;
        const targetMode = mode || 'focus';

        const timer = {
          timeLeft: targetDuration,
          initialTimeLeft: targetDuration,
          status: 'paused',
          mode: targetMode,
          lastUpdated: new Date()
        };
        roomTimers.set(roomId, timer);

        io.to(`room:${roomId}`).emit('timer:sync', {
          roomId,
          ...timer,
          action: 'reset'
        });

        await sendRoomNotification(io, roomId, 'Study timer reset.');

        console.log(`[Timer] Reset in room ${roomId} to ${targetDuration}s, mode: ${targetMode}`);
      } catch (error) {
        console.error('Error in timer:reset:', error);
      }
    });

    socket.on('timer:switch-mode', async (data) => {
      try {
        const { roomId, mode, duration } = data;

        if (roomIntervals.has(roomId)) {
          clearInterval(roomIntervals.get(roomId));
          roomIntervals.delete(roomId);
        }

        const timer = {
          timeLeft: duration,
          initialTimeLeft: duration,
          status: 'paused',
          mode: mode,
          lastUpdated: new Date()
        };
        roomTimers.set(roomId, timer);

        io.to(`room:${roomId}`).emit('timer:sync', {
          roomId,
          ...timer,
          action: 'mode-switched'
        });

        await sendRoomNotification(io, roomId, `${mode === 'focus' ? 'Focus' : 'Break'} session started.`);

        console.log(`[Timer] Mode switched in room ${roomId} to ${mode}, duration: ${duration}s`);
      } catch (error) {
        console.error('Error in timer:switch-mode:', error);
      }
    });

    socket.on('timer:state-request', (data) => {
      try {
        const { roomId } = data;
        const timerState = getTimerState(roomId);
        if (timerState) {
          socket.emit('timer:sync', {
            roomId,
            ...timerState
          });
        }
      } catch (error) {
        console.error('Error in timer:state-request:', error);
      }
    });

    socket.on('timer:update', (data) => {
      try {
        const { roomId, timeLeft, status, mode, initialTimeLeft } = data;
        const timer = roomTimers.get(roomId);
        if (timer) {
          if (timeLeft !== undefined) timer.timeLeft = timeLeft;
          if (status !== undefined) timer.status = status;
          if (mode !== undefined) timer.mode = mode;
          if (initialTimeLeft !== undefined) timer.initialTimeLeft = initialTimeLeft;
          timer.lastUpdated = new Date();

          io.to(`room:${roomId}`).emit('timer:update', {
            roomId,
            timeLeft: timer.timeLeft,
            status: timer.status,
            mode: timer.mode,
            initialTimeLeft: timer.initialTimeLeft
          });
        }
      } catch (error) {
        console.error('Error in timer:update:', error);
      }
    });

    socket.on('room:invite', async (data) => {
      try {
        const { roomId, recipientUserId } = data;

        // Since userSocketMap is updated to support sets, get the first socket or loop over them
        const recipientSockets = userSockets.get(recipientUserId);

        if (recipientSockets) {
          const room = await Room.findById(roomId)
            .select('name description studyDuration')
            .lean();

          for (const socketId of recipientSockets) {
            io.to(socketId).emit('room:invite-received', {
              roomId,
              room
            });
          }

          console.log(`Invite sent to user ${recipientUserId} for room ${roomId}`);
        }
      } catch (error) {
        console.error('Error in room:invite:', error);
      }
    });

    socket.on('disconnect', async () => {
      try {
        const userId = socket.userId;
        const roomId = socket.roomId;

        if (userId) {
          const sockets = userSockets.get(userId);
          if (sockets) {
            sockets.delete(socket.id);
            console.log(`[Presence] Socket disconnected: ${socket.id} (remaining sockets for user ${userId}: ${sockets.size})`);
            
            if (sockets.size === 0) {
              // Start grace period of 5 seconds to allow reconnects / page refreshes
              const timeoutId = setTimeout(async () => {
                userSockets.delete(userId);
                disconnectTimeouts.delete(userId);

                // If they were in a room, handle notification + member update
                if (roomId) {
                  // Store disconnect notification in-memory immediately
                  let senderName = 'Someone';
                  try {
                    const userObj = await User.findById(userId);
                    if (userObj) senderName = userObj.username;
                  } catch (e) { /* silent */ }

                  await sendRoomNotification(io, roomId, `${senderName} disconnected`);

                  // Best-effort DB operations
                  try {
                    await User.findByIdAndUpdate(userId, { isOnline: false, currentRoomId: null });
                    const roomObj = await Room.findById(roomId);
                    if (roomObj) {
                      roomObj.members = roomObj.members.filter(m => m.toString() !== userId);
                      await roomObj.save();
                    }
                  } catch (dbErr) {
                    console.warn(`[Disconnect] DB update failed: ${dbErr.message}`);
                  }

                  // Fetch and broadcast updated members list
                  let members = [];
                  try {
                    const room = await Room.findById(roomId).populate('members', 'username avatar').lean();
                    members = room ? room.members : [];
                  } catch (e) { /* silent */ }

                  io.to(`room:${roomId}`).emit('room:members-updated', {
                    roomId, members, totalMembers: members.length
                  });
                } else {
                  // Not in a room, just update online status
                  User.findByIdAndUpdate(userId, { isOnline: false }).catch(() => {});
                }

                // Broadcast updated online list (best-effort)
                try {
                  const onlineUsers = await User.find({ isOnline: true })
                    .select('_id username avatar bio').lean();
                  io.emit('users:list', onlineUsers);
                } catch (e) { /* silent */ }

                console.log(`[Presence] User ${userId} fully offline after grace period.`);
              }, 5000);

              disconnectTimeouts.set(userId, timeoutId);
            }
          } // end if (sockets)

          // Clean up roomSocketMap immediately for this specific socket
          if (roomId && roomSocketMap.has(roomId)) {
            roomSocketMap.get(roomId).delete(socket.id);
            if (roomSocketMap.get(roomId).size === 0) {
              if (roomIntervals.has(roomId)) {
                clearInterval(roomIntervals.get(roomId));
                roomIntervals.delete(roomId);
                console.log(`[Timer] Room ${roomId} empty on disconnect. Stopped timer interval.`);
              }
            }
          }
        } // end if (userId)
      } catch (error) {
        console.error('Error in disconnect handler:', error);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

export const getActiveUsers = () => Array.from(userSockets.keys());
export const getActiveRooms = () => Array.from(roomSocketMap.keys());
