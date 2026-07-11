const mongoose = require('mongoose');

const ChatReadStatusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    room: {
      type: String,
      required: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Unique compound index so there is at most one read status per user per room
ChatReadStatusSchema.index({ user: 1, room: 1 }, { unique: true });

module.exports = mongoose.model('ChatReadStatus', ChatReadStatusSchema);
