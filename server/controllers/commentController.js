const Comment = require('../models/Comment');
const Article = require('../models/Article');
const { scanText } = require('../utils/filter');

// @desc    Add comment
// @route   POST /api/articles/:articleId/comments
// @access  Private (any logged in user)
exports.addComment = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.articleId);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    // Check global lock
    const SystemSetting = require('../models/SystemSetting');
    const settings = await SystemSetting.findOne({ key: 'global_settings' });
    if (settings && settings.globalCommentLock) {
      return res.status(403).json({ success: false, message: 'Comments are temporarily disabled globally by an admin.' });
    }

    // Check if article comments are locked
    if (article.isLocked || article.commentsDisabled) {
      return res.status(403).json({ success: false, message: 'Comments are locked for this article.' });
    }

    // Scan comment for harmful content
    const scanResult = await scanText(req.body.text || '');
    if (scanResult.isFlagged) {
      // If user is admin/moderator, give warning without restricting account
      if (['admin', 'moderator'].includes(req.user.role)) {
        return res.status(400).json({
          success: false,
          warning: true,
          message: `Warning: Your comment contains restricted content (${scanResult.reason}). It was not posted, but admin accounts are not restricted.`,
          reason: scanResult.reason,
        });
      }

      // Auto-block the user temporarily (1 hour)
      const User = require('../models/User');
      const blockedUntil = new Date(Date.now() + 1 * 60 * 60 * 1000);
      await User.findByIdAndUpdate(req.user.id, {
        isBlocked: true,
        blockedReason: `Posted a comment violating community guidelines: ${scanResult.reason}`,
        blockedAt: new Date(),
        blockedUntil,
      });

      // Emit real-time status update to socket
      const io = req.app.get('io');
      if (io) {
        io.emit('user:status', {
          userId: req.user.id,
          isBlocked: true,
          blockedReason: `Posted a comment violating community guidelines: ${scanResult.reason}`,
          blockedUntil,
          appealRequested: false,
          appealMessage: '',
        });
      }

      return res.status(403).json({
        success: false,
        blocked: true,
        message: 'Your comment contained harmful content and your account has been temporarily suspended.',
        reason: scanResult.reason,
        blockedUntil,
      });
    }

    const comment = await Comment.create({
      article: req.params.articleId,
      author: req.user.id,
      text: req.body.text,
      parentComment: req.body.parentComment || null,
      isApproved: true,
    });

    await comment.populate('author', 'name username showRealNamePublicly avatar role');

    // Broadcast to everyone viewing this article via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`article:${req.params.articleId}`).emit('comment:new', comment);
    }

    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
};


// @desc    Get comments for an article
// @route   GET /api/articles/:articleId/comments
// @access  Public - all comments are auto-approved, no filtering needed
exports.getComments = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const skip = (Number(page) - 1) * safeLimit;

    const query = { article: req.params.articleId };
    const total = await Comment.countDocuments(query);
    const comments = await Comment.find(query)
      .populate('author', 'name username showRealNamePublicly avatar role')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();

    res.status(200).json({
      success: true,
      count: comments.length,
      total,
      totalPages: Math.ceil(total / safeLimit),
      currentPage: Number(page),
      data: comments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve comment (editor/admin)
// @route   PUT /api/comments/:id/approve
// @access  Private/Editor/Admin
exports.approveComment = async (req, res, next) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    ).populate('author', 'name');
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    res.status(200).json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
};

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private (author or admin)
exports.updateComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    if (comment.author.toString() !== req.user.id && !['admin', 'editor', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this comment' });
    }

    // Scan for harmful content
    const scanResult = await scanText(text.trim());
    if (scanResult.isFlagged) {
      return res.status(400).json({ success: false, message: `Harmful content detected: ${scanResult.reason}` });
    }

    comment.text = text.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    await comment.populate('author', 'name username showRealNamePublicly avatar role');

    // Broadcast edit via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`article:${comment.article}`).emit('comment:edited', comment);
    }

    res.status(200).json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private (owner or admin)
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.author.toString() !== req.user.id && !['admin', 'editor', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const articleId = comment.article;
    await comment.deleteOne();

    const io = req.app.get('io');
    if (io) {
      io.to(`article:${articleId}`).emit('comment:deleted', { _id: req.params.id });
    }

    res.status(200).json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all pending comments (admin)
// @route   GET /api/comments/pending
// @access  Private/Admin/Editor
exports.getPendingComments = async (req, res, next) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const skip = (Number(page) - 1) * safeLimit;

    const query = { isApproved: false };
    const total = await Comment.countDocuments(query);
    const comments = await Comment.find(query)
      .populate('author', 'name email')
      .populate('article', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();

    res.status(200).json({
      success: true,
      count: comments.length,
      total,
      totalPages: Math.ceil(total / safeLimit),
      currentPage: Number(page),
      data: comments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get comments written by current user
// @route   GET /api/comments/my-comments
// @access  Private
exports.getMyComments = async (req, res, next) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const skip = (Number(page) - 1) * safeLimit;

    const query = { author: req.user.id };
    const total = await Comment.countDocuments(query);
    const comments = await Comment.find(query)
      .populate('article', 'title slug category coverImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();

    res.status(200).json({
      success: true,
      count: comments.length,
      total,
      totalPages: Math.ceil(total / safeLimit),
      currentPage: Number(page),
      data: comments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle like on comment
// @route   POST /api/comments/:id/like
// @access  Private
exports.likeComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    if (!Array.isArray(comment.likes)) {
      comment.likes = [];
    }

    const userIndex = comment.likes.findIndex(uid => uid.toString() === req.user.id.toString());
    if (userIndex > -1) {
      comment.likes.splice(userIndex, 1);
    } else {
      comment.likes.push(req.user.id);
    }
    await comment.save();

    res.status(200).json({ success: true, likes: comment.likes });
  } catch (err) {
    next(err);
  }
};

