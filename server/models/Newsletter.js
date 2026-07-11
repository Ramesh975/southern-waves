const mongoose = require('mongoose');

const NewsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Newsletter', NewsletterSchema);
