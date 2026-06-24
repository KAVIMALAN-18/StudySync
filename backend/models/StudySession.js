import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    },
    focusMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    breakMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    pomodoroCount: {
      type: Number,
      default: 0,
      min: 0
    },
    sessionDate: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      }
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Index for fast per-user stats queries
studySessionSchema.index({ userId: 1, sessionDate: -1 });
studySessionSchema.index({ roomId: 1, sessionDate: -1 });

export default mongoose.model('StudySession', studySessionSchema);
