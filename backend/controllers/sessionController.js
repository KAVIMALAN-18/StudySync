import mongoose from 'mongoose';
import StudySession from '../models/StudySession.js';
import { inMemory } from '../utils/inMemoryStore.js';

// ─── Internal helper (called from socket events) ─────────────────────────────

/**
 * Record or update a study session for a user in a room.
 * Always updates in-memory first; persists to MongoDB best-effort.
 */
export const recordSession = async (userId, roomId, { focusMinutes = 0, breakMinutes = 0, incrementPomodoro = false } = {}) => {
  // Update in-memory session store
  const session = inMemory.upsertSession(userId, roomId, { focusMinutes, breakMinutes, incrementPomodoro });

  // Async MongoDB persist (silent on failure)
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await StudySession.findOneAndUpdate(
      { userId, roomId, sessionDate: today },
      {
        $inc: {
          focusMinutes,
          breakMinutes,
          pomodoroCount: incrementPomodoro ? 1 : 0
        },
        $set: { completedAt: new Date() }
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn(`[Session] DB persist failed (in-memory only): ${err.message}`);
  }

  return session;
};

// ─── REST API handlers ────────────────────────────────────────────────────────

export const getSessionHistory = async (req, res) => {
  const userId = req.userId;
  try {
    const sessions = await StudySession.find({ userId })
      .sort({ sessionDate: -1 })
      .limit(30)
      .populate('roomId', 'name')
      .lean();

    return res.json({ data: sessions });
  } catch (err) {
    // Fallback: return empty array gracefully
    console.warn(`[Session] getSessionHistory DB error: ${err.message}`);
    return res.json({ data: [] });
  }
};

export const getSessionStats = async (req, res) => {
  const userId = req.userId;

  // Try DB first
  try {
    const [aggregate] = await StudySession.aggregate([
      { $match: { userId: { $eq: userId } } },
      {
        $group: {
          _id: null,
          totalFocusMinutes: { $sum: '$focusMinutes' },
          totalBreakMinutes: { $sum: '$breakMinutes' },
          totalPomodoros: { $sum: '$pomodoroCount' },
          sessionDates: { $addToSet: '$sessionDate' }
        }
      }
    ]);

    const stats = aggregate || { totalFocusMinutes: 0, totalBreakMinutes: 0, totalPomodoros: 0, sessionDates: [] };
    const streak = computeStreak(stats.sessionDates || []);

    return res.json({
      data: {
        totalFocusMinutes: stats.totalFocusMinutes,
        totalBreakMinutes: stats.totalBreakMinutes,
        totalPomodoros: stats.totalPomodoros,
        streak
      }
    });
  } catch (err) {
    console.warn(`[Session] getSessionStats DB error: ${err.message}`);
    // Return in-memory stats as fallback
    const memStats = inMemory.getUserStats(userId);
    return res.json({ data: { ...memStats, streak: 0 } });
  }
};

export const getRoomStats = async (req, res) => {
  const { roomId } = req.params;
  try {
    let roomObjId;
    try {
      roomObjId = new mongoose.Types.ObjectId(roomId);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const stats = await StudySession.aggregate([
      { $match: { roomId: roomObjId } },
      {
        $group: {
          _id: '$userId',
          totalFocusMinutes: { $sum: '$focusMinutes' },
          totalPomodoros: { $sum: '$pomodoroCount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$_id',
          username: { $ifNull: ['$user.username', 'Unknown'] },
          totalFocusMinutes: 1,
          totalPomodoros: 1
        }
      },
      { $sort: { totalFocusMinutes: -1 } },
      { $limit: 20 }
    ]);
    return res.json({ data: stats });
  } catch (err) {
    console.warn(`[Session] getRoomStats DB error: ${err.message}`);
    return res.json({ data: [] });
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStreak(dates) {
  if (!dates || dates.length === 0) return 0;

  const sorted = dates
    .map(d => new Date(d).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a);

  const unique = [...new Set(sorted)];
  const today = new Date().setHours(0, 0, 0, 0);
  const day = 86400000;

  if (unique[0] !== today && unique[0] !== today - day) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i - 1] - unique[i] === day) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
