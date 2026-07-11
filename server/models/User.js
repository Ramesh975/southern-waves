const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'editor', 'moderator', 'admin'],
      default: 'student',
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
    },
    firstName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
    },
    university: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    academicMajor: {
      type: String,
      trim: true,
      default: '',
    },
    yearOfStudy: {
      type: String,
      trim: true,
      default: '',
    },
    recommendationSettings: {
      preferredCategories: {
        type: [String],
        default: [],
      },
      preferredTags: {
        type: [String],
        default: [],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // --- Content Moderation Block Fields ---
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedReason: {
      type: String,
      default: '',
    },
    blockedAt: {
      type: Date,
    },
    blockedUntil: {
      type: Date,
      default: null, // null means indefinite block
    },
    appealRequested: {
      type: Boolean,
      default: false,
    },
    appealMessage: {
      type: String,
      default: '',
    },
    savedArticles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
      }
    ],
    viewedArticles: [
      {
        article: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Article',
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      }
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpire: Date,
    refreshToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
