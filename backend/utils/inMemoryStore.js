/**
 * In-memory store — shared across socketEvents and controllers.
 * Used as primary cache and as fallback when MongoDB is unavailable.
 */

// ─── Message Store ────────────────────────────────────────────────────────────
// roomId -> Message[]
const messageStore = new Map();
const MAX_MESSAGES_PER_ROOM = 200;

let _msgIdCounter = 1;
const generateId = () => `mem_${Date.now()}_${_msgIdCounter++}`;

export const inMemory = {
  // ── Messages ──────────────────────────────────────────────────────────────

  addMessage(roomId, { senderId, senderName, content, type = 'message' }) {
    if (!messageStore.has(roomId)) messageStore.set(roomId, []);
    const messages = messageStore.get(roomId);

    const msg = {
      _id: generateId(),
      roomId,
      senderId,
      senderName,
      content,
      type,
      timestamp: new Date(),
    };

    messages.push(msg);
    if (messages.length > MAX_MESSAGES_PER_ROOM) {
      messages.splice(0, messages.length - MAX_MESSAGES_PER_ROOM);
    }

    return msg;
  },

  getMessages(roomId, { limit = 50, skip = 0 } = {}) {
    const messages = messageStore.get(roomId) || [];
    return messages.slice(-(limit + skip)).slice(0, limit);
  },

  clearRoom(roomId) {
    messageStore.delete(roomId);
  },

  seedFromDb(roomId, dbMessages) {
    if (!messageStore.has(roomId) && dbMessages.length > 0) {
      messageStore.set(roomId, dbMessages.slice(-MAX_MESSAGES_PER_ROOM));
    }
  },

  // ── Session Store ─────────────────────────────────────────────────────────
  // key: `${userId}::${roomId}` -> { focusMinutes, breakMinutes, pomodoroCount }

  _sessions: new Map(),

  upsertSession(userId, roomId, { focusMinutes = 0, breakMinutes = 0, incrementPomodoro = false } = {}) {
    const key = `${userId}::${roomId}`;
    const existing = this._sessions.get(key) || { focusMinutes: 0, breakMinutes: 0, pomodoroCount: 0 };

    const updated = {
      userId,
      roomId,
      focusMinutes: existing.focusMinutes + focusMinutes,
      breakMinutes: existing.breakMinutes + breakMinutes,
      pomodoroCount: existing.pomodoroCount + (incrementPomodoro ? 1 : 0),
    };

    this._sessions.set(key, updated);
    return updated;
  },

  getSession(userId, roomId) {
    return this._sessions.get(`${userId}::${roomId}`) || {
      focusMinutes: 0, breakMinutes: 0, pomodoroCount: 0
    };
  },

  getUserStats(userId) {
    let totalFocusMinutes = 0;
    let totalBreakMinutes = 0;
    let totalPomodoros = 0;

    for (const [key, session] of this._sessions.entries()) {
      if (key.startsWith(`${userId}::`)) {
        totalFocusMinutes += session.focusMinutes;
        totalBreakMinutes += session.breakMinutes;
        totalPomodoros += session.pomodoroCount;
      }
    }

    return { totalFocusMinutes, totalBreakMinutes, totalPomodoros };
  },

  getRoomSessionSummary(roomId) {
    const result = [];
    for (const [key, session] of this._sessions.entries()) {
      if (key.endsWith(`::${roomId}`)) {
        result.push(session);
      }
    }
    return result;
  },
};
