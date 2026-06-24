import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String, // base64 representation of files or text data
      required: true
    },
    mimetype: {
      type: String,
      default: 'application/octet-stream'
    },
    size: {
      type: Number,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('File', fileSchema);
