const mongoose = require('mongoose');

const FilterWordSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: [true, 'Filter word is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['profanity', 'hate-speech', 'scam', 'cyberbullying', 'spam'],
      default: 'profanity',
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

FilterWordSchema.index({ category: 1 });

module.exports = mongoose.model('FilterWord', FilterWordSchema);
