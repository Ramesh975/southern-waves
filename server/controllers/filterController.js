const FilterWord = require('../models/FilterWord');
const Article = require('../models/Article');
const User = require('../models/User');
const BlockedTag = require('../models/BlockedTag');
const { DEFAULT_WORDS } = require('../utils/filter');

// @desc    Get all custom filter words
// @route   GET /api/filters
// @access  Private (admin, moderator)
exports.getFilterWords = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const query = {};
    if (category && category !== 'all') query.category = category;
    if (search) {
      query.word = { $regex: search, $options: 'i' };
    }

    const words = await FilterWord.find(query)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: words.length, data: words });
  } catch (err) {
    next(err);
  }
};

// @desc    Get default (hardcoded) words list
// @route   GET /api/filters/defaults
// @access  Private (admin, moderator)
exports.getDefaultWords = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: DEFAULT_WORDS });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a custom filter word
// @route   POST /api/filters
// @access  Private (admin, moderator)
exports.addFilterWord = async (req, res, next) => {
  try {
    const { word, category, severity } = req.body;

    if (!word || !word.trim()) {
      return res.status(400).json({ success: false, message: 'Word is required' });
    }

    const existing = await FilterWord.findOne({ word: word.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This word is already in the filter list' });
    }

    const filterWord = await FilterWord.create({
      word: word.toLowerCase().trim(),
      category: category || 'profanity',
      severity: severity || 'medium',
      createdBy: req.user.id,
    });

    await filterWord.populate('createdBy', 'name role');
    res.status(201).json({ success: true, data: filterWord });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a filter word (toggle active, change category/severity)
// @route   PUT /api/filters/:id
// @access  Private (admin, moderator)
exports.updateFilterWord = async (req, res, next) => {
  try {
    const filterWord = await FilterWord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name role');

    if (!filterWord) return res.status(404).json({ success: false, message: 'Filter word not found' });

    res.status(200).json({ success: true, data: filterWord });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a custom filter word
// @route   DELETE /api/filters/:id
// @access  Private (admin, moderator)
exports.deleteFilterWord = async (req, res, next) => {
  try {
    const filterWord = await FilterWord.findByIdAndDelete(req.params.id);
    if (!filterWord) return res.status(404).json({ success: false, message: 'Filter word not found' });

    res.status(200).json({ success: true, message: 'Filter word removed' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all flagged (pending moderation) articles
// @route   GET /api/filters/flagged
// @access  Private (admin, moderator)
exports.getFlaggedArticles = async (req, res, next) => {
  try {
    const articles = await Article.find({ isFlagged: true })
      .populate('author', 'name email avatar role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: articles.length, data: articles });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all pending articles (awaiting admin approval after filter flag)
// @route   GET /api/filters/pending
// @access  Private (admin, moderator)
exports.getPendingArticles = async (req, res, next) => {
  try {
    const articles = await Article.find({ status: 'pending' })
      .populate('author', 'name email avatar role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: articles.length, data: articles });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve a flagged/pending article (moderator decision)
// @route   PUT /api/filters/articles/:id/approve
// @access  Private (admin, moderator)
exports.approveArticle = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    article.status = 'published';
    article.isFlagged = false;
    article.flaggedReason = '';
    article.publishedAt = article.publishedAt || new Date();
    await article.save();

    // Also unblock the author if they were auto-blocked for this content
    if (req.body.unblockAuthor) {
      await User.findByIdAndUpdate(article.author, {
        isBlocked: false,
        blockedReason: '',
        blockedAt: undefined,
        blockedUntil: undefined,
        appealRequested: false,
        appealMessage: '',
      });
    }

    res.status(200).json({ success: true, data: article, message: 'Article approved and published.' });
  } catch (err) {
    next(err);
  }
};

// @desc    Lock an article (no new comments allowed)
// @route   PUT /api/filters/articles/:id/lock
// @access  Private (admin, moderator)
exports.lockArticle = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { isLocked: req.body.lock !== false }, // default to locking
      { new: true }
    );
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    const action = article.isLocked ? 'locked' : 'unlocked';
    res.status(200).json({ success: true, data: article, message: `Article ${action} successfully.` });
  } catch (err) {
    next(err);
  }
};

// @desc    Ban/unban an article
// @route   PUT /api/filters/articles/:id/ban
// @access  Private (admin, moderator)
exports.banArticle = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { isBanned: req.body.ban !== false }, // default to banning
      { new: true }
    );
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    const action = article.isBanned ? 'banned' : 'unbanned';
    res.status(200).json({ success: true, data: article, message: `Article ${action} successfully.` });
  } catch (err) {
    next(err);
  }
};

// @desc    Dismiss (delete) a flagged article
// @route   DELETE /api/filters/articles/:id
// @access  Private (admin, moderator)
exports.dismissFlaggedArticle = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    res.status(200).json({ success: true, message: 'Flagged article removed.' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all blocked tags
// @route   GET /api/filters/tags
// @access  Private (admin, moderator)
exports.getBlockedTags = async (req, res, next) => {
  try {
    const tags = await BlockedTag.find()
      .populate('createdBy', 'name role')
      .sort({ tag: 1 });
    res.status(200).json({ success: true, count: tags.length, data: tags });
  } catch (err) {
    next(err);
  }
};

// @desc    Block a tag
// @route   POST /api/filters/tags
// @access  Private (admin, moderator)
exports.addBlockedTag = async (req, res, next) => {
  try {
    const { tag } = req.body;
    if (!tag || !tag.trim()) {
      return res.status(400).json({ success: false, message: 'Tag name is required' });
    }
    const cleanTag = tag.toLowerCase().trim().replace(/#/g, '');
    if (!cleanTag) {
      return res.status(400).json({ success: false, message: 'Invalid tag name' });
    }
    const existing = await BlockedTag.findOne({ tag: cleanTag });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This tag is already blocked' });
    }
    const blocked = await BlockedTag.create({
      tag: cleanTag,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: blocked });
  } catch (err) {
    next(err);
  }
};

// @desc    Unblock a tag
// @route   DELETE /api/filters/tags/:id
// @access  Private (admin, moderator)
exports.deleteBlockedTag = async (req, res, next) => {
  try {
    const blocked = await BlockedTag.findById(req.params.id);
    if (!blocked) {
      return res.status(404).json({ success: false, message: 'Blocked tag not found' });
    }
    await blocked.deleteOne();
    res.status(200).json({ success: true, message: 'Tag unblocked successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get global content security settings
// @route   GET /api/filters/settings
// @access  Private (admin, moderator)
exports.getSystemSettings = async (req, res, next) => {
  try {
    const SystemSetting = require('../models/SystemSetting');
    let settings = await SystemSetting.findOne({ key: 'global_settings' });
    if (!settings) {
      settings = await SystemSetting.create({ key: 'global_settings' });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

// @desc    Update global content security settings (Admin Only)
// @route   PUT /api/filters/settings
// @access  Private (admin only)
exports.updateSystemSettings = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can modify overall lock settings.' });
    }
    const SystemSetting = require('../models/SystemSetting');
    const { globalCommentLock, globalChatLock } = req.body;
    
    let settings = await SystemSetting.findOne({ key: 'global_settings' });
    if (!settings) {
      settings = new SystemSetting({ key: 'global_settings' });
    }
    
    if (globalCommentLock !== undefined) settings.globalCommentLock = globalCommentLock;
    if (globalChatLock !== undefined) settings.globalChatLock = globalChatLock;
    
    await settings.save();
    res.status(200).json({ success: true, data: settings, message: 'Overall security settings updated.' });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle comments/chat lock on a specific article (Editor or Admin)
// @route   PUT /api/filters/articles/:id/security
// @access  Private (admin, editor)
exports.toggleContentSecurity = async (req, res, next) => {
  try {
    const { commentsDisabled, chatDisabled, reason } = req.body;
    
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    
    if (commentsDisabled !== undefined) article.commentsDisabled = commentsDisabled;
    if (chatDisabled !== undefined) article.chatDisabled = chatDisabled;
    if (reason !== undefined) article.securityReason = reason;
    
    article.securityChangedBy = req.user.id;
    
    await article.save();
    await article.populate('securityChangedBy', 'name role');
    
    res.status(200).json({ success: true, data: article, message: 'Article security settings updated.' });
  } catch (err) {
    next(err);
  }
};
