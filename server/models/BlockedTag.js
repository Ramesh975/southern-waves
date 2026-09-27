const mongoose = require('mongoose');

const BlockedTagSchema = new mongoose.Schema(
  {
    tag: {
      type: String,
      required: [true, 'Tag name is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

BlockedTagSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BlockedTag', BlockedTagSchema);
