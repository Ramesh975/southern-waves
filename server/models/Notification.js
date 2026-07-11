const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: ['board_news', 'announcement', 'sensitivity', 'appeal'],
      required: [true, 'Notification type is required'],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
