const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1500, 'Message cannot exceed 1500 characters'],
    },
    type: {
      type: String,
      enum: ['board_news', 'announcement', 'sensitivity', 'appeal', 'message', 'editorial', 'comment', 'system'],
      default: 'announcement',
      required: [true, 'Notification type is required'],
    },
    priority: {
      type: String,
      enum: ['normal', 'high', 'urgent', 'pinned'],
      default: 'normal'
    },
    actionUrl: {
      type: String,
      default: ''
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
