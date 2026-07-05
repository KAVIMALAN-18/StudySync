import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    subject: {
      type: String,
      default: 'General Study'
    },
    code: {
      type: String,
      unique: true,
      sparse: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    admins: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    capacity: {
      type: Number,
      default: 10,
      min: 2,
      max: 50
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    studyDuration: {
      type: Number,
      default: 30,
      min: 5,
      max: 240
    },
    startTime: {
      type: Date,
      default: null
    },
    endTime: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'archived'],
      default: 'active'
    },
    timerRunning: {
      type: Boolean,
      default: false
    },
    timerMode: {
      type: String,
      enum: ['focus', 'break'],
      default: 'focus'
    },
    timeRemaining: {
      type: Number,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);
