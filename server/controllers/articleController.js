const Article = require('../models/Article');
const Comment = require('../models/Comment');
const jwt = require('jsonwebtoken');
const { scanText, scanForBlockedTags } = require('../utils/filter');

// @desc    Get all published articles (with filters, pagination)
// @route   GET /api/articles
// @access  Public
exports.getArticles = async (req, res, next) => {
  try {
    const { category, status, featured, trending, breaking, tag, page = 1, limit = 10, search, sort, pushedToHome, author, likedBy } = req.query;

    const query = {};

    if (author) {
      query.author = author;
    }

    if (likedBy) {
      query.likes = likedBy;
    }

    // Public users only see published, except if they query their own posts
    if (!req.user || req.user.role === 'student') {
      if (req.user && author === req.user.id) {
        if (status) {
          query.status = status;
        }
      } else {
        query.status = 'published';
      }
    } else if (status) {
      query.status = status;
    }

    // Always exclude banned articles from public listings unless admin/moderator is in adminView
    if (req.query.adminView !== 'true') {
      query.isBanned = { $ne: true };
    }

    if (category) {
      query.category = category;
    } else if (req.query.adminView !== 'true' && !tag) {
      // Exclude tea-shop from general public listings only when not filtering by tag
      query.category = { $ne: 'tea-shop' };
    }
    if (featured === 'true') query.isFeatured = true;
    if (trending === 'true') query.isTrending = true;
    if (breaking === 'true') query.isBreaking = true;
    if (pushedToHome === 'true') query.isPushedToHome = true;
    if (tag) query.tags = { $in: [tag.toLowerCase()] };
    if (search) {
      const escapedSearch = search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');

      const User = require('../models/User');
      const matchedUsers = await User.find({ name: searchRegex }).select('_id');
      const authorIds = matchedUsers.map(u => u._id);

      query.$or = [
        { title: searchRegex },
        { lead: searchRegex },
        { body: searchRegex },
        { tags: searchRegex },
        { category: searchRegex },
        { subCategory: searchRegex }
      ];

      if (authorIds.length > 0) {
        query.$or.push({ author: { $in: authorIds } });
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Article.countDocuments(query);
    let sortQuery = { publishedAt: -1, createdAt: -1 };
    if (sort === 'views') {
      sortQuery = { views: -1 };
    } else if (sort === 'historicalYearAsc') {
      sortQuery = { historicalYear: 1, createdAt: -1 };
    } else if (sort === 'historicalYearDesc') {
      sortQuery = { historicalYear: -1, createdAt: -1 };
    }

    const articles = await Article.find(query)
      .populate('author', 'name avatar role')
      .populate('references.article', 'title slug category coverImage')
      .populate('securityChangedBy', 'name role')
      .sort(sortQuery)
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: articles.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data: articles,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single article by slug
// @route   GET /api/articles/:slug
// @access  Public
exports.getArticleBySlug = async (req, res, next) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug })
      .populate('author', 'name avatar bio role')
      .populate('references.article', 'title slug category coverImage author')
      .populate('securityChangedBy', 'name role');
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    // Get comments (approved, plus unapproved comments if created by the logged-in user)
    let userId = null;
    let token = null;

    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Proceed as anonymous on token error
      }
    }

    // Increment views
    article.views += 1;
    await article.save({ validateBeforeSave: false });

    // Log view to user history if logged in
    if (userId) {
      try {
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (user) {
          // Remove existing view of this article if any to update order
          user.viewedArticles = user.viewedArticles.filter(
            (va) => va.article && va.article.toString() !== article._id.toString()
          );
          user.viewedArticles.push({ article: article._id, viewedAt: new Date() });
          // Cap history at 50
          if (user.viewedArticles.length > 50) {
            user.viewedArticles = user.viewedArticles.slice(-50);
          }
          await user.save({ validateBeforeSave: false });
        }
      } catch (userErr) {
        console.error('Failed to log article view to user profile:', userErr);
      }
    }

    const commentQuery = { article: article._id };
    if (userId) {
      commentQuery.$or = [
        { isApproved: true },
        { author: userId }
      ];
    } else {
      commentQuery.isApproved = true;
    }

    const comments = await Comment.find(commentQuery)
      .populate('author', 'name avatar')
      .sort({ createdAt: 1 });

    // Related articles
    const related = await Article.find({
      category: article.category,
      status: 'published',
      _id: { $ne: article._id },
    })
      .populate('author', 'name avatar')
      .limit(4)
      .sort({ publishedAt: -1 });

    res.status(200).json({ success: true, data: article, comments, related });
  } catch (err) {
    next(err);
  }
};

// @desc    Create article
// @route   POST /api/articles
// @access  Private (writer, editor, admin)
exports.createArticle = async (req, res, next) => {
  try {
    req.body.author = req.user.id;
    
    // Handle file uploads from req.files using Cloudinary (or local fallback)
    if (req.files) {
      const { uploadToCloudinary } = require('../utils/cloudinary');
      if (req.files.coverImage && req.files.coverImage.length > 0) {
        req.body.coverImage = await uploadToCloudinary(req.files.coverImage[0]);
      }
      if (req.files.images && req.files.images.length > 0) {
        let captions = [];
        if (req.body.captions) {
          try {
            captions = typeof req.body.captions === 'string' ? JSON.parse(req.body.captions) : req.body.captions;
          } catch (e) {
            captions = [];
          }
        }
        const uploadedImages = [];
        for (let i = 0; i < req.files.images.length; i++) {
          const url = await uploadToCloudinary(req.files.images[i]);
          uploadedImages.push({
            url,
            caption: Array.isArray(captions) ? (captions[i] || '') : (captions || '')
          });
        }
        req.body.images = uploadedImages;
      }
    }

    // Default coverImage to first slide if omitted for picture speaks
    if (!req.body.coverImage && req.body.images && req.body.images.length > 0) {
      req.body.coverImage = req.body.images[0].url;
    }

    // If client sent existing images as JSON string
    if (req.body.images && typeof req.body.images === 'string') {
      try {
        req.body.images = JSON.parse(req.body.images);
      } catch (e) {}
    }

    // If student, restrict to published tea-shop post OR pending pictures-speak post
    if (req.user.role === 'student') {
      if (req.body.category === 'pictures-speak') {
        req.body.status = 'pending';
      } else {
        req.body.category = 'tea-shop';
        req.body.status = 'published';
      }
      req.body.isFeatured = false;
      req.body.isTrending = false;
      req.body.isBreaking = false;
      req.body.isPushedToHome = false;
    }

    // Only admin can push to home
    if (req.user.role !== 'admin') {
      req.body.isPushedToHome = false;
    }

    // If pushed to home is true, maintain maximum 5 pushed articles by demoting oldest
    if (req.body.isPushedToHome === true || req.body.isPushedToHome === 'true') {
      const pushedArticles = await Article.find({ isPushedToHome: true }).sort({ updatedAt: -1 });
      if (pushedArticles.length >= 5) {
        const toDemote = pushedArticles.slice(4); // Keep top 4, demote others
        const demoteIds = toDemote.map(a => a._id);
        await Article.updateMany({ _id: { $in: demoteIds } }, { isPushedToHome: false });
      }
    }

    // Parse tags if sent as string
    if (req.body.tags && typeof req.body.tags === 'string') {
      req.body.tags = req.body.tags.split(',').map((t) => t.trim());
    }

    // Parse references if sent as stringified JSON
    if (req.body.references && typeof req.body.references === 'string') {
      try {
        req.body.references = JSON.parse(req.body.references);
      } catch (e) {
        req.body.references = [];
      }
    }

    // Check for blocked tags
    if (req.body.tags && req.body.tags.length > 0) {
      const tagCheck = await scanForBlockedTags({ tags: req.body.tags });
      if (tagCheck.isFlagged) {
        return res.status(400).json({ success: false, message: 'Not Allowed Tags' });
      }
    }

    // ─── Content Filter ─────────────────────────────────────────────────
    // For student-authored posts going to tea-shop, scan for harmful content
    if (req.user.role === 'student') {
      const scanResult = await scanText([
        req.body.title || '',
        req.body.lead || '',
        req.body.body || '',
      ]);

      if (scanResult.isFlagged) {
        // Flag the article and set to pending review
        req.body.status = 'pending';
        req.body.isFlagged = true;
        req.body.flaggedReason = scanResult.reason;

        // Auto-block the author temporarily (24 hours)
        const User = require('../models/User');
        const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await User.findByIdAndUpdate(req.user.id, {
          isBlocked: true,
          blockedReason: `Posted content violating community guidelines: ${scanResult.reason}`,
          blockedAt: new Date(),
          blockedUntil,
        });

        // Emit real-time status update to socket
        const io = req.app.get('io');
        if (io) {
          io.emit('user:status', {
            userId: req.user.id,
            isBlocked: true,
            blockedReason: `Posted content violating community guidelines: ${scanResult.reason}`,
            blockedUntil,
            appealRequested: false,
            appealMessage: '',
          });
        }
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    const article = await Article.create(req.body);
    await article.populate('author', 'name avatar role');

    // Emit real-time breaking news event via Socket.io
    if (article.status === 'published' && article.isBreaking) {
      const io = req.app.get('io');
      if (io) {
        io.emit('article:breaking', article);
      }
    }

    res.status(201).json({ success: true, data: article });
  } catch (err) {
    next(err);
  }
};

// @desc    Update article
// @route   PUT /api/articles/:id
// @access  Private (owner or admin/editor)
exports.updateArticle = async (req, res, next) => {
  try {
    let article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    // Check ownership or elevated role
    if (
      article.author.toString() !== req.user.id &&
      !['admin', 'editor'].includes(req.user.role)
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this article' });
    }

    // If student, restrict category and status
    if (req.user.role === 'student') {
      if (req.body.category === 'pictures-speak' || article.category === 'pictures-speak') {
        req.body.status = 'pending';
      } else {
        req.body.category = 'tea-shop';
        req.body.status = 'published';
      }
      req.body.isFeatured = false;
      req.body.isTrending = false;
      req.body.isBreaking = false;
      req.body.isPushedToHome = false;
    }

    // Handle file uploads from req.files using Cloudinary (or local fallback)
    if (req.files) {
      const { uploadToCloudinary } = require('../utils/cloudinary');
      if (req.files.coverImage && req.files.coverImage.length > 0) {
        req.body.coverImage = await uploadToCloudinary(req.files.coverImage[0]);
      }
      if (req.files.images && req.files.images.length > 0) {
        let captions = [];
        if (req.body.captions) {
          try {
            captions = typeof req.body.captions === 'string' ? JSON.parse(req.body.captions) : req.body.captions;
          } catch (e) {
            captions = [];
          }
        }
        const uploadedImages = [];
        for (let i = 0; i < req.files.images.length; i++) {
          const url = await uploadToCloudinary(req.files.images[i]);
          uploadedImages.push({
            url,
            caption: Array.isArray(captions) ? (captions[i] || '') : (captions || '')
          });
        }
        req.body.images = uploadedImages;
      }
    }

    // Default coverImage to first slide if omitted for picture speaks
    if (!req.body.coverImage && req.body.images && req.body.images.length > 0) {
      req.body.coverImage = req.body.images[0].url;
    }

    // If client sent existing images as JSON string
    if (req.body.images && typeof req.body.images === 'string') {
      try {
        req.body.images = JSON.parse(req.body.images);
      } catch (e) {}
    }

    // Only admin can push to home
    if (req.user.role !== 'admin') {
      delete req.body.isPushedToHome;
    }

    // If pushed to home is true, maintain maximum 5 pushed articles by demoting oldest
    if (req.body.isPushedToHome === true || req.body.isPushedToHome === 'true') {
      const pushedArticles = await Article.find({ isPushedToHome: true, _id: { $ne: req.params.id } }).sort({ updatedAt: -1 });
      if (pushedArticles.length >= 5) {
        const toDemote = pushedArticles.slice(4); // Keep top 4, demote others
        const demoteIds = toDemote.map(a => a._id);
        await Article.updateMany({ _id: { $in: demoteIds } }, { isPushedToHome: false });
      }
    }

    if (req.body.tags && typeof req.body.tags === 'string') {
      req.body.tags = req.body.tags.split(',').map((t) => t.trim());
    }

    // Parse references if sent as stringified JSON
    if (req.body.references && typeof req.body.references === 'string') {
      try {
        req.body.references = JSON.parse(req.body.references);
      } catch (e) {
        req.body.references = [];
      }
    }

    // Check for blocked tags
    if (req.body.tags && req.body.tags.length > 0) {
      const tagCheck = await scanForBlockedTags({ tags: req.body.tags });
      if (tagCheck.isFlagged) {
        return res.status(400).json({ success: false, message: 'Not Allowed Tags' });
      }
    }

    article = await Article.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('author', 'name avatar role');

    // Emit real-time breaking news event via Socket.io
    if (article.status === 'published' && article.isBreaking) {
      const io = req.app.get('io');
      if (io) {
        io.emit('article:breaking', article);
      }
    }

    res.status(200).json({ success: true, data: article });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete article
// @route   DELETE /api/articles/:id
// @access  Private (owner or admin)
exports.deleteArticle = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    if (article.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Comment.deleteMany({ article: article._id });
    await article.deleteOne();
    res.status(200).json({ success: true, message: 'Article and its comments deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc    Increment share count
// @route   POST /api/articles/:id/share
// @access  Public
exports.shareArticle = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true }
    );
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    res.status(200).json({ success: true, shares: article.shares });
  } catch (err) {
    next(err);
  }
};

// @desc    Get trending articles
// @route   GET /api/articles/trending
// @access  Public
exports.getTrending = async (req, res, next) => {
  try {
    const query = { status: 'published' };
    if (req.query.category) {
      query.category = req.query.category;
    }

    const articles = await Article.find(query)
      .populate('author', 'name avatar');

    // Aggregate comment counts
    const Comment = require('../models/Comment');
    const commentCounts = await Comment.aggregate([
      { $group: { _id: '$article', count: { $sum: 1 } } }
    ]);
    const commentCountsMap = {};
    commentCounts.forEach(c => {
      commentCountsMap[c._id.toString()] = c.count;
    });

    const now = new Date();

    const scoredArticles = articles.map(article => {
      const likesCount = article.likes ? article.likes.length : 0;
      const dislikesCount = article.dislikes ? article.dislikes.length : 0;
      const sharesCount = article.shares || 0;
      const viewsCount = article.views || 0;
      const commentsCount = commentCountsMap[article._id.toString()] || 0;

      // Calculate time elapsed in hours since publication (minimum 0.1 hours to prevent divide by zero)
      const pubTime = article.publishedAt || article.createdAt || now;
      const hoursElapsed = Math.max(0.1, (now - new Date(pubTime)) / (1000 * 60 * 60));

      // Hype/Engagement score algorithm: Views + Shares*4 + Likes*3 + Comments*5 - Dislikes*2
      const hypeScore = viewsCount + (sharesCount * 4) + (likesCount * 3) + (commentsCount * 5) - (dislikesCount * 2);

      // Trending score uses standard time decay gravity of 1.6
      const trendingScore = hypeScore / Math.pow(hoursElapsed + 2, 1.6);

      return {
        article,
        hypeScore,
        trendingScore
      };
    });

    // Sort by trending score descending
    scoredArticles.sort((a, b) => b.trendingScore - a.trendingScore);

    // Take top 6 articles
    const result = scoredArticles.slice(0, 6).map(item => {
      const artObj = item.article.toObject();
      artObj.hypeScore = Math.round(item.hypeScore);
      artObj.trendingScore = item.trendingScore;
      return artObj;
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc    Get most read articles
// @route   GET /api/articles/most-read
// @access  Public
exports.getMostRead = async (req, res, next) => {
  try {
    const articles = await Article.find({ status: 'published' })
      .populate('author', 'name avatar')
      .sort({ views: -1 })
      .limit(6);
    res.status(200).json({ success: true, data: articles });
  } catch (err) {
    next(err);
  }
};

// @desc    Like article
// @route   POST /api/articles/:id/like
// @access  Private
exports.likeArticle = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    const userId = req.user.id;
    const isLiked = article.likes.includes(userId);
    const isDisliked = article.dislikes.includes(userId);

    if (isLiked) {
      // Toggle off
      article.likes = article.likes.filter((id) => id.toString() !== userId);
    } else {
      // Add like
      article.likes.push(userId);
      // Remove dislike if exists
      if (isDisliked) {
        article.dislikes = article.dislikes.filter((id) => id.toString() !== userId);
      }
    }

    await article.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, likes: article.likes, dislikes: article.dislikes });
  } catch (err) {
    next(err);
  }
};

// @desc    Dislike article
// @route   POST /api/articles/:id/dislike
// @access  Private
exports.dislikeArticle = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    const userId = req.user.id;
    const isLiked = article.likes.includes(userId);
    const isDisliked = article.dislikes.includes(userId);

    if (isDisliked) {
      // Toggle off
      article.dislikes = article.dislikes.filter((id) => id.toString() !== userId);
    } else {
      // Add dislike
      article.dislikes.push(userId);
      // Remove like if exists
      if (isLiked) {
        article.likes = article.likes.filter((id) => id.toString() !== userId);
      }
    }

    await article.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, likes: article.likes, dislikes: article.dislikes });
  } catch (err) {
    next(err);
  }
};

// @desc    Get trending tags
// @route   GET /api/articles/tags/trending
// @access  Public
exports.getTrendingTags = async (req, res, next) => {
  try {
    const match = { status: 'published' };
    if (req.query.category) {
      match.category = req.query.category;
    }

    // Limit to articles from the last 30 days to measure active trending
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    match.publishedAt = { $gte: thirtyDaysAgo };

    const articles = await Article.find(match).select('tags views shares likes dislikes publishedAt createdAt');

    // Aggregate comment counts
    const Comment = require('../models/Comment');
    const commentCounts = await Comment.aggregate([
      { $group: { _id: '$article', count: { $sum: 1 } } }
    ]);
    const commentCountsMap = {};
    commentCounts.forEach(c => {
      commentCountsMap[c._id.toString()] = c.count;
    });

    const now = new Date();
    const tagScores = {};
    const tagCounts = {};

    articles.forEach(article => {
      const likesCount = article.likes ? article.likes.length : 0;
      const dislikesCount = article.dislikes ? article.dislikes.length : 0;
      const sharesCount = article.shares || 0;
      const viewsCount = article.views || 0;
      const commentsCount = commentCountsMap[article._id.toString()] || 0;

      const pubTime = article.publishedAt || article.createdAt || now;
      const hoursElapsed = Math.max(0.1, (now - new Date(pubTime)) / (1000 * 60 * 60));

      const hypeScore = viewsCount + (sharesCount * 4) + (likesCount * 3) + (commentsCount * 5) - (dislikesCount * 2);
      const trendingScore = hypeScore / Math.pow(hoursElapsed + 2, 1.6);

      if (article.tags && Array.isArray(article.tags)) {
        article.tags.forEach(tag => {
          const cleanTag = tag.toLowerCase().trim();
          if (!cleanTag) return;
          tagScores[cleanTag] = (tagScores[cleanTag] || 0) + trendingScore;
          tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
        });
      }
    });

    let resultTags = Object.keys(tagScores).map(tag => ({
      tag,
      score: tagScores[tag],
      count: tagCounts[tag]
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

    // Fallback: if we have fewer than 5 tags from the last 30 days, get all-time frequent tags
    if (resultTags.length < 5) {
      const fallbackMatch = { status: 'published' };
      if (req.query.category) {
        fallbackMatch.category = req.query.category;
      }
      const fallbackTags = await Article.aggregate([
        { $match: fallbackMatch },
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            tag: '$_id',
            count: 1
          }
        }
      ]);
      res.status(200).json({ success: true, data: fallbackTags });
    } else {
      res.status(200).json({ success: true, data: resultTags });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Get recommended articles for the user
// @route   GET /api/articles/recommendations
// @access  Public (Optional Auth)
exports.getRecommendations = async (req, res, next) => {
  try {
    let userId = null;
    let token = null;

    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Proceed as anonymous
      }
    }

    const now = new Date();

    // Get comment counts map
    const Comment = require('../models/Comment');
    const commentCounts = await Comment.aggregate([
      { $group: { _id: '$article', count: { $sum: 1 } } }
    ]);
    const commentCountsMap = {};
    commentCounts.forEach(c => {
      commentCountsMap[c._id.toString()] = c.count;
    });

    const getArticleStats = (article) => {
      const likesCount = article.likes ? article.likes.length : 0;
      const dislikesCount = article.dislikes ? article.dislikes.length : 0;
      const sharesCount = article.shares || 0;
      const viewsCount = article.views || 0;
      const commentsCount = commentCountsMap[article._id.toString()] || 0;

      const pubTime = article.publishedAt || article.createdAt || now;
      const hoursElapsed = Math.max(0.1, (now - new Date(pubTime)) / (1000 * 60 * 60));

      const hypeScore = viewsCount + (sharesCount * 4) + (likesCount * 3) + (commentsCount * 5) - (dislikesCount * 2);
      const trendingScore = hypeScore / Math.pow(hoursElapsed + 2, 1.4);

      return { hypeScore, trendingScore, hoursElapsed };
    };

    let recommendations = [];
    let userInterests = { categories: [], tags: [] };

    let user = null;
    let likedArticles = [];

    if (userId) {
      const User = require('../models/User');
      user = await User.findById(userId).populate('savedArticles');
      likedArticles = await Article.find({ likes: userId });
    }

    const hasHistoryOrPreferences = user && (
      (user.savedArticles && user.savedArticles.length > 0) ||
      (user.viewedArticles && user.viewedArticles.length > 0) ||
      likedArticles.length > 0 ||
      (user.recommendationSettings && (
        (user.recommendationSettings.preferredCategories && user.recommendationSettings.preferredCategories.length > 0) ||
        (user.recommendationSettings.preferredTags && user.recommendationSettings.preferredTags.length > 0)
      ))
    );

    if (hasHistoryOrPreferences) {
      const categoryWeights = {};
      const tagWeights = {};

      const addWeights = (article, weight) => {
        if (!article) return;
        if (article.category) {
          categoryWeights[article.category] = (categoryWeights[article.category] || 0) + weight;
        }
        if (article.tags && Array.isArray(article.tags)) {
          article.tags.forEach(tag => {
            const cleanTag = tag.toLowerCase().trim();
            if (cleanTag) {
              tagWeights[cleanTag] = (tagWeights[cleanTag] || 0) + weight;
            }
          });
        }
      };

      // Apply explicit recommendation preference weights
      if (user.recommendationSettings) {
        if (user.recommendationSettings.preferredCategories && Array.isArray(user.recommendationSettings.preferredCategories)) {
          user.recommendationSettings.preferredCategories.forEach(cat => {
            categoryWeights[cat] = (categoryWeights[cat] || 0) + 12;
          });
        }
        if (user.recommendationSettings.preferredTags && Array.isArray(user.recommendationSettings.preferredTags)) {
          user.recommendationSettings.preferredTags.forEach(tag => {
            const cleanTag = tag.toLowerCase().trim();
            if (cleanTag) {
              tagWeights[cleanTag] = (tagWeights[cleanTag] || 0) + 10;
            }
          });
        }
      }

      // Add academic interest weights
      if (user.academicMajor) {
        const cleanMajor = user.academicMajor.toLowerCase().trim();
        if (cleanMajor) {
          tagWeights[cleanMajor] = (tagWeights[cleanMajor] || 0) + 6;
        }
      }
      if (user.yearOfStudy) {
        const cleanYear = user.yearOfStudy.toLowerCase().trim();
        if (cleanYear) {
          tagWeights[cleanYear] = (tagWeights[cleanYear] || 0) + 6;
        }
      }

      if (user.savedArticles) {
        user.savedArticles.forEach(art => addWeights(art, 4));
      }

      likedArticles.forEach(art => addWeights(art, 3));

      if (user.viewedArticles && user.viewedArticles.length > 0) {
        const viewedIds = user.viewedArticles.map(v => v.article).filter(Boolean);
        const viewedDetails = await Article.find({ _id: { $in: viewedIds } }).select('category tags');
        viewedDetails.forEach(art => addWeights(art, 1));
      }

      const sortedCategories = Object.keys(categoryWeights).map(cat => ({
        category: cat,
        weight: categoryWeights[cat]
      })).sort((a, b) => b.weight - a.weight);

      const sortedTags = Object.keys(tagWeights).map(tag => ({
        tag,
        weight: tagWeights[tag]
      })).sort((a, b) => b.weight - a.weight);

      userInterests = {
        categories: sortedCategories.slice(0, 5),
        tags: sortedTags.slice(0, 8)
      };

      const viewedIds = user.viewedArticles ? user.viewedArticles.map(v => v.article ? v.article.toString() : '') : [];
      const savedIds = user.savedArticles ? user.savedArticles.map(a => a._id.toString()) : [];
      const likedIds = likedArticles.map(a => a._id.toString());
      const excludeIds = [...new Set([...viewedIds, ...savedIds, ...likedIds])];

      const candidates = await Article.find({
        status: 'published',
        category: { $ne: 'tea-shop' },
        _id: { $nin: excludeIds }
      }).populate('author', 'name avatar role');

      const scoredCandidates = candidates.map(article => {
        const { hypeScore, trendingScore, hoursElapsed } = getArticleStats(article);

        const catWeight = categoryWeights[article.category] || 0;
        let tagWeightSum = 0;
        let matchedTags = [];
        if (article.tags) {
          article.tags.forEach(t => {
            const cleanT = t.toLowerCase().trim();
            if (tagWeights[cleanT]) {
              tagWeightSum += tagWeights[cleanT];
              matchedTags.push(cleanT);
            }
          });
        }

        const similarityScore = (catWeight * 1.5) + tagWeightSum;
        const finalScore = (1 + similarityScore) * (1 + hypeScore) / Math.pow(hoursElapsed + 2, 1.4);

        let recommendationRationale = '';
        if (matchedTags.length > 0) {
          recommendationRationale = `Matches your interest in #${matchedTags[0]}`;
        } else if (catWeight > 0) {
          recommendationRationale = `Trending in ${article.category.toUpperCase()}`;
        } else {
          recommendationRationale = 'Popular story for you';
        }

        return {
          article,
          score: finalScore,
          rationale: recommendationRationale
        };
      });

      scoredCandidates.sort((a, b) => b.score - a.score);
      recommendations = scoredCandidates.slice(0, 10).map(item => {
        const artObj = item.article.toObject();
        artObj.recommendationRationale = item.rationale;
        artObj.recommendationScore = item.score;
        return artObj;
      });

      if (recommendations.length < 5) {
        const currentIds = recommendations.map(r => r._id.toString());
        const extraArticles = await Article.find({
          status: 'published',
          category: { $ne: 'tea-shop' },
          _id: { $nin: [...excludeIds, ...currentIds] }
        })
          .populate('author', 'name avatar role')
          .limit(8 - recommendations.length);

        extraArticles.forEach(article => {
          const artObj = article.toObject();
          artObj.recommendationRationale = 'Highly recommended trending story';
          recommendations.push(artObj);
        });
      }
    } else {
      // Guest or no interaction history fallback
      const articles = await Article.find({
        status: 'published',
        category: { $ne: 'tea-shop' }
      }).populate('author', 'name avatar role');

      const scored = articles.map(article => {
        const { hypeScore, trendingScore, hoursElapsed } = getArticleStats(article);
        
        let score = trendingScore;
        if (article.isFeatured) score *= 1.5;
        if (article.isBreaking) score *= 1.8;

        let rationale = 'Trending on campus';
        if (article.isBreaking) rationale = 'Breaking news';
        else if (article.isFeatured) rationale = 'Featured editor choice';

        return { article, score, rationale };
      });

      scored.sort((a, b) => b.score - a.score);
      recommendations = scored.slice(0, 10).map(item => {
        const artObj = item.article.toObject();
        artObj.recommendationRationale = item.rationale;
        artObj.recommendationScore = item.score;
        return artObj;
      });
    }

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations,
      userInterests
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get most liked articles
// @route   GET /api/articles/most-liked
// @access  Public
exports.getMostLiked = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 6;
    const category = req.query.category;
    
    const match = { status: 'published' };
    if (category) {
      match.category = category;
    } else {
      match.category = { $ne: 'tea-shop' };
    }

    const articles = await Article.aggregate([
      { $match: match },
      { $addFields: { likesCount: { $size: '$likes' } } },
      { $sort: { likesCount: -1, publishedAt: -1 } },
      { $limit: limit }
    ]);

    const populatedArticles = await Article.populate(articles, {
      path: 'author',
      select: 'name avatar role'
    });

    res.status(200).json({
      success: true,
      count: populatedArticles.length,
      data: populatedArticles
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get stats for uploads based on user role
// @route   GET /api/articles/my-uploads/stats
// @access  Private
exports.getMyUploadsStats = async (req, res, next) => {
  try {
    const role = req.user.role;
    const userId = req.user._id;

    // Get own articles
    const ownArticles = await Article.find({ author: userId });
    const ownCounts = {
      total: ownArticles.length,
      published: ownArticles.filter(a => a.status === 'published').length,
      pending: ownArticles.filter(a => a.status === 'pending').length,
      draft: ownArticles.filter(a => a.status === 'draft').length,
      archived: ownArticles.filter(a => a.status === 'archived').length,
      views: ownArticles.reduce((sum, a) => sum + (a.views || 0), 0),
      likes: ownArticles.reduce((sum, a) => sum + (a.likes?.length || 0), 0),
      shares: ownArticles.reduce((sum, a) => sum + (a.shares || 0), 0),
    };

    // Calculate comments count for own articles
    const ownArticleIds = ownArticles.map(a => a._id);
    const ownCommentsCount = ownArticleIds.length > 0
      ? await Comment.countDocuments({ article: { $in: ownArticleIds } })
      : 0;
    ownCounts.comments = ownCommentsCount;

    // Category distribution of user's own uploads
    const ownCategoryDist = {};
    ownArticles.forEach(a => {
      ownCategoryDist[a.category] = (ownCategoryDist[a.category] || 0) + 1;
    });

    const responseData = {
      role,
      ownStats: ownCounts,
      ownCategoryDistribution: ownCategoryDist,
    };

    // Role-based custom integrations
    if (role === 'moderator') {
      const flaggedArticlesCount = await Article.countDocuments({ isFlagged: true });
      const pendingCommentsCount = await Comment.countDocuments({ isApproved: false });
      responseData.moderatorStats = {
        flaggedArticles: flaggedArticlesCount,
        pendingComments: pendingCommentsCount,
      };
    } 
    else if (role === 'editor') {
      const pendingSubmissions = await Article.countDocuments({ status: 'pending' });
      const totalArticlesCount = await Article.countDocuments();
      const publishedArticlesCount = await Article.countDocuments({ status: 'published' });
      
      const allCategories = await Article.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);
      const categoryDistribution = {};
      allCategories.forEach(c => {
        categoryDistribution[c._id] = c.count;
      });

      responseData.editorStats = {
        pendingSubmissions,
        totalArticles: totalArticlesCount,
        publishedArticles: publishedArticlesCount,
        categoryDistribution,
      };
    }
    else if (role === 'admin') {
      const User = require('../models/User');
      const totalUsers = await User.countDocuments();
      const usersByRole = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);
      const roleDistribution = {};
      usersByRole.forEach(r => {
        roleDistribution[r._id] = r.count;
      });

      const totalArticles = await Article.countDocuments();
      const publishedArticles = await Article.countDocuments({ status: 'published' });
      const pendingSubmissions = await Article.countDocuments({ status: 'pending' });
      const flaggedArticles = await Article.countDocuments({ isFlagged: true });
      
      const allArticlesStats = await Article.aggregate([
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$views' },
            totalShares: { $sum: '$shares' },
          }
        }
      ]);
      
      const totalViews = allArticlesStats[0]?.totalViews || 0;
      const totalShares = allArticlesStats[0]?.totalShares || 0;
      const totalComments = await Comment.countDocuments();

      responseData.adminStats = {
        totalUsers,
        roleDistribution,
        totalArticles,
        publishedArticles,
        pendingSubmissions,
        flaggedArticles,
        totalViews,
        totalShares,
        totalComments,
      };
    }

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (err) {
    next(err);
  }
};

