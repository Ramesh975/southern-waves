const express = require('express');
const router = express.Router();
const { protect, checkBlocked } = require('../middleware/auth');
const { scanText, scanForBlockedTags } = require('../utils/filter');
const ChatMessage = require('../models/ChatMessage');
const ChatReadStatus = require('../models/ChatReadStatus');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get chat messages for a room (cursor-based pagination, newest 50 by default)
// @route   GET /api/chat?category=news&before=<messageId>
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const { category, tag, before } = req.query;
    const PAGE_SIZE = 50;

    let query = {};

    // If tag is provided, search by tag. Otherwise, use category or default to 'tea-shop'
    if (tag) {
      query.tags = { $in: [tag.toLowerCase()] };
    } else {
      query.category = category || 'tea-shop';
      // For general category chat, exclude messages with tags to keep rooms isolated
      query.tags = { $size: 0 };
    }

    // Cursor: if `before` is provided, only fetch messages older than that ID
    if (before) {
      const cursorMsg = await ChatMessage.findById(before).select('createdAt');
      if (cursorMsg) {
        query.createdAt = { $lt: cursorMsg.createdAt };
      }
    }

    const messages = await ChatMessage.find(query)
      .populate('user', 'name avatar role')
      .populate('reactions.user', 'name')
      .populate({
        path: 'parentMessage',
        populate: { path: 'user', select: 'name' }
      })
      .populate('parentArticle', 'title slug category coverImage')
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE);

    // Check if there are even older messages beyond this page
    const hasMore = messages.length === PAGE_SIZE;

    // Send back in chronological order (oldest first)
    res.json({ success: true, data: messages.reverse(), hasMore });
  } catch (err) {
    next(err);
  }
});


// @desc    Get unread counts and latest messages for all active chat rooms
// @route   GET /api/chat/unread
// @access  Private
router.get('/unread', protect, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const categories = ['news', 'editorial', 'features', 'know-your-past', 'tea-shop', 'pictures-speak'];
    
    // Fetch all distinct tags in the system to dynamically populate tag rooms
    const tags = await ChatMessage.distinct('tags');

    // Get user's read timestamps
    const readStatuses = await ChatReadStatus.find({ user: userId });
    const readStatusMap = {};
    readStatuses.forEach(status => {
      readStatusMap[status.room] = status.lastReadAt;
    });

    const roomsInfo = [];

    // 1. Process category rooms (groups)
    for (const cat of categories) {
      const roomKey = `category:${cat}`;
      const lastReadAt = readStatusMap[roomKey] || new Date(0);

      // Find the latest message in this category room
      const lastMsg = await ChatMessage.findOne({ category: cat, tags: { $size: 0 } })
        .populate('user', 'name')
        .sort({ createdAt: -1 });

      // Count unread messages
      const unreadCount = await ChatMessage.countDocuments({
        category: cat,
        tags: { $size: 0 },
        createdAt: { $gt: lastReadAt }
      });

      roomsInfo.push({
        type: 'group',
        name: cat,
        roomKey,
        lastMessage: lastMsg ? {
          text: lastMsg.text,
          user: lastMsg.user?.name || 'System',
          createdAt: lastMsg.createdAt
        } : null,
        unreadCount
      });
    }

    // 2. Process tag rooms
    for (const tag of tags) {
      if (!tag) continue;
      const roomKey = `tag:${tag}`;
      const lastReadAt = readStatusMap[roomKey] || new Date(0);

      const lastMsg = await ChatMessage.findOne({ tags: tag })
        .populate('user', 'name')
        .sort({ createdAt: -1 });

      const unreadCount = await ChatMessage.countDocuments({
        tags: tag,
        createdAt: { $gt: lastReadAt }
      });

      if (lastMsg) {
        roomsInfo.push({
          type: 'tag',
          name: tag,
          roomKey,
          lastMessage: {
            text: lastMsg.text,
            user: lastMsg.user?.name || 'System',
            createdAt: lastMsg.createdAt
          },
          unreadCount
        });
      }
    }

    res.json({ success: true, data: roomsInfo });
  } catch (err) {
    next(err);
  }
});

// @desc    Get chat replies targeting the current user
// @route   GET /api/chat/replies
// @access  Private
router.get('/replies', protect, async (req, res, next) => {
  try {
    const messages = await ChatMessage.find({ replyToUser: req.user.id })
      .populate('user', 'name avatar role')
      .populate({
        path: 'parentMessage',
        populate: { path: 'user', select: 'name' }
      })
      .populate('parentArticle', 'title slug category coverImage')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
});

// @desc    Mark a specific room channel as read
// @route   POST /api/chat/read
// @access  Private
router.post('/read', protect, async (req, res, next) => {
  try {
    const { room } = req.body;
    if (!room) {
      return res.status(400).json({ success: false, message: 'Room is required' });
    }

    await ChatReadStatus.findOneAndUpdate(
      { user: req.user.id, room },
      { lastReadAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: `Room ${room} marked as read` });
  } catch (err) {
    next(err);
  }
});

// @desc    Send a chat message
// @route   POST /api/chat
// @access  Private (not blocked)
router.post('/', protect, checkBlocked, async (req, res, next) => {
  try {
    const { text, category = 'tea-shop', tags, isBroadcast, parentMessageId, parentArticleId, tempId } = req.body;
    // Check global lock
    const SystemSetting = require('../models/SystemSetting');
    const settings = await SystemSetting.findOne({ key: 'global_settings' });
    if (settings && settings.globalChatLock) {
      return res.status(403).json({ success: false, message: 'Chat is temporarily disabled globally by an admin.' });
    }

    // Check if chat is disabled for this particular article
    if (parentArticleId) {
      const Article = require('../models/Article');
      const article = await Article.findById(parentArticleId);
      if (article && article.chatDisabled) {
        return res.status(403).json({ success: false, message: 'Chat is disabled for this article.' });
      }
    }

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    // ─── Content Filter ─────────────────────────────────────────────
    const scanResult = await scanText(text.trim());
    if (scanResult.isFlagged) {
      // Auto-block the user for 1 hour
      const blockedUntil = new Date(Date.now() + 60 * 60 * 1000);
      await User.findByIdAndUpdate(req.user.id, {
        isBlocked: true,
        blockedReason: `Sent a chat message violating community guidelines: ${scanResult.reason}`,
        blockedAt: new Date(),
        blockedUntil,
      });

      // Emit real-time status update to socket
      const io = req.app.get('io');
      if (io) {
        io.emit('user:status', {
          userId: req.user.id,
          isBlocked: true,
          blockedReason: `Sent a chat message violating community guidelines: ${scanResult.reason}`,
          blockedUntil,
          appealRequested: false,
          appealMessage: '',
        });
      }

      return res.status(403).json({
        success: false,
        blocked: true,
        message: 'Your message contained harmful content and your account has been temporarily suspended.',
        reason: scanResult.reason,
        blockedUntil,
      });
    }
    // ─────────────────────────────────────────────────────────────────

    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        parsedTags = tags.split(',').map(t => t.trim().toLowerCase());
      } else if (Array.isArray(tags)) {
        parsedTags = tags.map(t => t.toLowerCase());
      }
    }

    // Check for blocked tags
    const tagCheck = await scanForBlockedTags({ tags: parsedTags, text: text });
    if (tagCheck.isFlagged) {
      return res.status(400).json({ success: false, message: 'Not Allowed Tags' });
    }


    // Determine if this is a reply to another message
    let replyToUser = null;
    if (parentMessageId) {
      const parentMsg = await ChatMessage.findById(parentMessageId);
      if (parentMsg) {
        replyToUser = parentMsg.user;
      }
    }

    let message = await ChatMessage.create({
      user: req.user.id,
      text: text.trim(),
      category,
      tags: parsedTags,
      isBroadcast: Boolean(isBroadcast),
      parentMessage: parentMessageId || null,
      parentArticle: parentArticleId || null,
      replyToUser
    });

    if (Boolean(isBroadcast)) {
      let titleLabel = `Announcement in #${category}`;
      if (parsedTags && parsedTags.length > 0) {
        titleLabel = `Announcement in #${parsedTags.join(', #')}`;
      }
      
      const newNotification = await Notification.create({
        title: titleLabel,
        message: text.trim(),
        type: 'announcement',
        sender: req.user.id,
        readBy: []
      });

      await newNotification.populate('sender', 'name avatar');

      // Emit new notification event globally
      const io = req.app.get('io');
      if (io) {
        io.emit('notification:new', newNotification);
      }
    }

    message = await ChatMessage.findById(message._id)
      .populate('user', 'name avatar role')
      .populate({
        path: 'parentMessage',
        populate: { path: 'user', select: 'name' }
      })
      .populate('parentArticle', 'title slug category coverImage');

    // Convert message document to plain object to attach tempId for optimistic updates
    const messageData = message.toObject();
    if (tempId) {
      messageData.tempId = tempId;
    }

    // Broadcast message via Socket.io
    const io = req.app.get('io');
    if (io) {
      // Send message to the specific room channels
      if (parsedTags.length > 0) {
        parsedTags.forEach(t => {
          io.to(`tag:${t}`).emit('chat:message', messageData);
        });
      } else {
        io.to(`category:${category}`).emit('chat:message', messageData);
      }

      // Emit a global lightweight notification so other online users can increment unread badges
      io.emit('chat:notification', {
        _id: message._id,
        tempId: tempId || null,
        text: message.text,
        category: message.category,
        tags: message.tags,
        isBroadcast: message.isBroadcast,
        user: { _id: message.user._id, name: message.user.name },
        createdAt: message.createdAt,
        replyToUser: message.replyToUser
      });
    }

    res.status(201).json({ success: true, data: messageData });
  } catch (err) {
    next(err);
  }
});

// @desc    Edit a chat message
// @route   PUT /api/chat/:id
// @access  Private (Author only within 15 mins, not blocked)
router.put('/:id', protect, checkBlocked, async (req, res, next) => {
  try {
    const message = await ChatMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    if (message.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this message' });
    }

    // Check 15 min timer
    const timeElapsed = Date.now() - new Date(message.createdAt).getTime();
    const fifteenMins = 15 * 60 * 1000;
    if (timeElapsed > fifteenMins) {
      return res.status(400).json({ success: false, message: 'Cannot edit messages after 15 minutes' });
    }

    const { text, tags } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    // ─── Content Filter ─────────────────────────────────────────────
    const scanResult = await scanText(text.trim());
    if (scanResult.isFlagged) {
      // Auto-block the user for 1 hour
      const blockedUntil = new Date(Date.now() + 60 * 60 * 1000);
      await User.findByIdAndUpdate(req.user.id, {
        isBlocked: true,
        blockedReason: `Edited a chat message to violate community guidelines: ${scanResult.reason}`,
        blockedAt: new Date(),
        blockedUntil,
      });

      // Emit real-time status update to socket
      const io = req.app.get('io');
      if (io) {
        io.emit('user:status', {
          userId: req.user.id,
          isBlocked: true,
          blockedReason: `Edited a chat message to violate community guidelines: ${scanResult.reason}`,
          blockedUntil,
          appealRequested: false,
          appealMessage: '',
        });
      }

      return res.status(403).json({
        success: false,
        blocked: true,
        message: 'Your message contained harmful content and your account has been temporarily suspended.',
        reason: scanResult.reason,
        blockedUntil,
      });
    }
    // ─────────────────────────────────────────────────────────────────

    let parsedTags = message.tags || [];
    if (tags) {
      if (typeof tags === 'string') {
        parsedTags = tags.split(',').map(t => t.trim().toLowerCase());
      } else if (Array.isArray(tags)) {
        parsedTags = tags.map(t => t.toLowerCase());
      }
    }

    // Check for blocked tags
    const tagCheck = await scanForBlockedTags({ tags: parsedTags, text: text });
    if (tagCheck.isFlagged) {
      return res.status(400).json({ success: false, message: 'Not Allowed Tags' });
    }

    message.text = text.trim();
    message.isEdited = true;
    if (tags) {
      message.tags = parsedTags;
    }

    await message.save();
    await message.populate('user', 'name avatar role');
    await message.populate('reactions.user', 'name');
    await message.populate({
      path: 'parentMessage',
      populate: { path: 'user', select: 'name' }
    });

    const io = req.app.get('io');
    if (io) {
      if (message.tags && message.tags.length > 0) {
        message.tags.forEach(t => {
          io.to(`tag:${t}`).emit('chat:messageEdited', message);
        });
      } else {
        io.to(`category:${message.category}`).emit('chat:messageEdited', message);
      }
    }

    res.status(200).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

// @desc    React to a chat message
// @route   POST /api/chat/:id/react
// @access  Private (not blocked)
router.post('/:id/react', protect, checkBlocked, async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ success: false, message: 'Emoji is required' });

    const message = await ChatMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions.findIndex(
      r => r.user.toString() === req.user.id && r.emoji === emoji
    );

    if (existingReactionIndex !== -1) {
      // Toggle off (remove)
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({ user: req.user.id, emoji });
    }

    await message.save();
    await message.populate('user', 'name avatar role');
    await message.populate('reactions.user', 'name');
    await message.populate({
      path: 'parentMessage',
      populate: { path: 'user', select: 'name' }
    });

    const io = req.app.get('io');
    if (io) {
      if (message.tags && message.tags.length > 0) {
        message.tags.forEach(t => {
          io.to(`tag:${t}`).emit('chat:messageReacted', message);
        });
      } else {
        io.to(`category:${message.category}`).emit('chat:messageReacted', message);
      }
    }

    res.status(200).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

// @desc    Delete a chat message
// @route   DELETE /api/chat/:id
// @access  Private (Author or moderator/editor/admin)
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const message = await ChatMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    // Check ownership or elevated role
    if (
      message.user.toString() !== req.user.id &&
      !['admin', 'editor', 'moderator'].includes(req.user.role)
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
    }

    const category = message.category;
    const tags = message.tags || [];

    await message.deleteOne();

    // Broadcast deletion event to socket
    const io = req.app.get('io');
    if (io) {
      if (tags.length > 0) {
        tags.forEach(t => {
          io.to(`tag:${t}`).emit('chat:messageDeleted', { _id: req.params.id, category, tags });
        });
      } else {
        io.to(`category:${category}`).emit('chat:messageDeleted', { _id: req.params.id, category, tags });
      }
    }

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
