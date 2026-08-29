const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

CommentSchema.index({ article: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', CommentSchema);
