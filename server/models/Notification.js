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
    // Legacy free-form URL (kept for backward compat)
    actionUrl: {
      type: String,
      default: ''
    },
    // Structured action system — determines which CTA button to render
    actionType: {
      type: String,
      enum: [
        'none',
        'navigate',        // Navigate to actionUrl (internal path)
        'external_url',    // Open actionUrl in new tab
        'open_article',    // payload: { slug }
        'open_profile',    // payload: { username }
        'open_chat_room',  // payload: { roomType, name }
        'open_comment',    // payload: { slug, commentId? }
        'appeal_review',   // Inline appeal review deck (admin/mod only)
      ],
      default: 'none'
    },
    // Structured payload for the action (parsed by client-side router)
    actionPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    // Role gate — empty array = visible to ALL users
    // e.g. ['admin', 'moderator'] = only admins and moderators
    targetRoles: {
      type: [String],
      default: []
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
    // Users who dismissed the notification (hides from active drawer but stays in history)
    dismissedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    // Appeal resolution tracking
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', null],
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNote: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Index for faster queries
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ targetRoles: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
