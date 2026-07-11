const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    category: {
      type: String,
      required: true,
      default: 'tea-shop',
    },
    tags: [{ type: String, lowercase: true }],
    isBroadcast: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null,
    },
    parentArticle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      default: null,
    },
    replyToUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String,
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
