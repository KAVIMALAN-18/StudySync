import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    fullName: {
      type: String,
      default: '',
      trim: true
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    currentRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null
    },
    friends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    subjects: [{
      type: String
    }],
    themePreference: {
      type: String,
      default: 'dark'
    },
    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true }
    },
    privacyPreference: {
      showOnlineStatus: { type: Boolean, default: true },
      publicProfile: { type: Boolean, default: true }
    },
    studyPreferences: {
      defaultFocusDuration: { type: Number, default: 30 },
      defaultBreakDuration: { type: Number, default: 5 },
      studyGoal: { type: Number, default: 120 },
      preferredStudyTime: { type: String, default: 'Evening' }
    },
    friendRequestsEnabled: {
      type: Boolean,
      default: true
    },
    roomInvitesEnabled: {
      type: Boolean,
      default: true
    },
    allowAI: {
      type: Boolean,
      default: true
    },
    soundNotifications: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(password) {
  return bcryptjs.compare(password, this.password);
};

export default mongoose.model('User', userSchema);
