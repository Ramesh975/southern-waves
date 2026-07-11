const mongoose = require('mongoose');
const slugify = require('slugify');

const ArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      unique: true,
    },
    lead: {
      type: String,
      required: [true, 'Lead/summary is required'],
      maxlength: [400, 'Lead cannot exceed 400 characters'],
    },
    dek: {
      type: String,
      default: '',
    },
    body: {
      type: String,
      required: [true, 'Article body is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['news', 'editorial', 'features', 'kyp', 'tea-shop', 'pictures-speak'],
    },
    subCategory: {
      type: String,
      trim: true,
    },
    historicalYear: {
      type: Number,
      default: null,
    },
    coverImage: {
      type: String,
      default: '',
    },
    imageCaption: {
      type: String,
      default: '',
    },
    images: [
      {
        url: String,
        caption: String,
      },
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    references: [
      {
        article: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Article',
          required: true,
        },
        note: {
          type: String,
          default: '',
        },
      },
    ],
    tags: [{ type: String, lowercase: true }],
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'archived'],
      default: 'draft',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    isBreaking: {
      type: Boolean,
      default: false,
    },
    isPushedToHome: {
      type: Boolean,
      default: false,
    },
    // --- Content Moderation Fields ---
    isLocked: {
      type: Boolean,
      default: false, // if true, no new comments allowed
    },
    commentsDisabled: {
      type: Boolean,
      default: false,
    },
    chatDisabled: {
      type: Boolean,
      default: false,
    },
    securityReason: {
      type: String,
      default: '',
    },
    securityChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isBanned: {
      type: Boolean,
      default: false, // if true, article is hidden from all listings
    },
    isFlagged: {
      type: Boolean,
      default: false, // flagged by automated filter
    },
    flaggedReason: {
      type: String,
      default: '', // what triggered the flag
    },
    views: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    publishedAt: {
      type: Date,
    },
    fontSizeLevel: {
      type: Number,
      default: 2, // 1=small, 2=medium, 3=large (AA button)
    },
    annotations: [
      {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        type: { type: String, enum: ['heading', 'paragraph', 'button'], default: 'heading' },
        title: { type: String, default: '' },
        content: { type: String, default: '' },
        link: { type: String, default: '' }
      }
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate slug before save
ArticleSchema.pre('save', function (next) {
  if (!this.isModified('title')) return next();
  this.slug = slugify(this.title, { lower: true, strict: true });
  next();
});

// Set publishedAt when status changes to published
ArticleSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Virtual: comment count
ArticleSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'article',
  count: true,
});

// Index for performance
ArticleSchema.index({ title: 'text', lead: 'text', body: 'text', tags: 'text' });
ArticleSchema.index({ category: 1, status: 1, publishedAt: -1 });
ArticleSchema.index({ isTrending: 1, views: -1 });

module.exports = mongoose.model('Article', ArticleSchema);
