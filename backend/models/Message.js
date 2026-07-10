import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    senderName: {
      type: String,
      required: true
    },
    senderAvatar: {
      type: String,
      default: null
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['message', 'system', 'notification'],
      default: 'message'
    }
  },
  { timestamps: true }
);

messageSchema.index({ roomId: 1, timestamp: -1 });

export default mongoose.model('Message', messageSchema);
