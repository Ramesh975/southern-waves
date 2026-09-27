const Notification = require('../models/Notification');

// Helper: check if a notification is visible to a given user role
const isVisibleToRole = (notification, userRole) => {
  if (!notification.targetRoles || notification.targetRoles.length === 0) {
    return true; // No role restriction — visible to all
  }
  return notification.targetRoles.includes(userRole);
};

// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Private/Admin
exports.createNotification = async (req, res, next) => {
  try {
    const {
      title,
      message,
      type,
      priority,
      actionUrl,
      actionType,
      actionPayload,
      targetRoles,
    } = req.body;

    const notification = await Notification.create({
      title,
      message,
      type: type || 'announcement',
      priority: priority || 'normal',
      actionUrl: actionUrl || '',
      actionType: actionType || 'none',
      actionPayload: actionPayload || null,
      targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
      sender: req.user.id,
      readBy: [],
      dismissedBy: [],
    });

    await notification.populate('sender', 'name avatar role username');

    // Broadcast via socket — only to connected authenticated users who qualify
    const io = req.app.get('io');
    if (io) {
      if (!notification.targetRoles || notification.targetRoles.length === 0) {
        // Broadcast to all authenticated users
        io.emit('notification:new', notification);
      } else {
        // Role-scoped: emit to individual user sockets that match roles
        // Server emits to all; clients filter on their end using targetRoles
        io.emit('notification:new', notification);
      }
    }

    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all notifications for the current user (role-filtered + read status)
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const skip = (Number(page) - 1) * safeLimit;
    const userRole = req.user?.role || 'user';
    const isModOrAdmin = userRole === 'admin' || userRole === 'moderator';

    // Role-aware query: fetch notifications targeted at this user's role OR all users
    // Includes legacy documents where targetRoles does not exist, is null, is empty array, or matches userRole
    const roleQuery = {
      $and: [
        {
          $or: [
            { targetRoles: { $exists: false } },
            { targetRoles: null },
            { targetRoles: { $size: 0 } },
            { targetRoles: userRole },
          ],
        },
      ],
    };

    // User appeals are strictly confidential and restricted to administrators/moderators
    if (!isModOrAdmin) {
      roleQuery.$and.push({ type: { $ne: 'appeal' } });
    }

    const total = await Notification.countDocuments(roleQuery);
    const notifications = await Notification.find(roleQuery)
      .populate('sender', 'name avatar role username isBlocked appealRequested')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();

    const currentUserIdStr = req.user ? req.user.id.toString() : '';

    // Map to include user-specific read/dismissed status and dynamic appeal resolution status
    const data = notifications.map(n => {
      const isRead = Boolean(n.readBy && n.readBy.some(id => id.toString() === currentUserIdStr));
      const isDismissed = Boolean(n.dismissedBy && n.dismissedBy.some(id => id.toString() === currentUserIdStr));

      const senderObj = typeof n.sender === 'object' ? n.sender : null;
      const isSenderUnblocked = senderObj && !senderObj.isBlocked && !senderObj.appealRequested;
      const isResolved = Boolean(
        n.isResolved ||
        n.resolvedStatus === 'approved' ||
        n.resolvedStatus === 'rejected' ||
        (n.type === 'appeal' && isSenderUnblocked)
      );
      const resolvedStatus = n.resolvedStatus || (n.type === 'appeal' && isSenderUnblocked ? 'approved' : 'pending');

      return {
        ...n,
        isRead,
        isDismissed,
        isResolved,
        resolvedStatus,
      };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      total,
      totalPages: Math.ceil(total / safeLimit),
      currentPage: Number(page),
      data,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!notification.readBy.includes(req.user.id)) {
      notification.readBy.push(req.user.id);
      await notification.save();
    }

    res.status(200).json({ success: true, data: { ...notification.toObject(), isRead: true } });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all notifications as read for the current user
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user?.role || 'user';

    // Only update notifications visible to this user
    const roleQuery = {
      $or: [
        { targetRoles: { $exists: false } },
        { targetRoles: null },
        { targetRoles: { $size: 0 } },
        { targetRoles: userRole },
      ],
      readBy: { $ne: userId },
    };

    await Notification.updateMany(roleQuery, { $addToSet: { readBy: userId } });

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// @desc    Dismiss a notification (hide from active drawer, keep in history)
// @route   PUT /api/notifications/:id/dismiss
// @access  Private
exports.dismissNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const userId = req.user.id;
    const updates = {};

    // Add to dismissedBy
    if (!notification.dismissedBy.includes(userId)) {
      updates.$addToSet = { dismissedBy: userId };
    }
    // Also mark as read when dismissed
    if (!notification.readBy.includes(userId)) {
      if (updates.$addToSet) {
        updates.$addToSet.readBy = userId;
      } else {
        updates.$addToSet = { readBy: userId };
      }
    }

    if (Object.keys(updates).length > 0) {
      await Notification.findByIdAndUpdate(req.params.id, updates);
    }

    res.status(200).json({ success: true, message: 'Notification dismissed' });
  } catch (err) {
    next(err);
  }
};

// @desc    Clear / purge read notifications for current user (admin scoped)
// @route   DELETE /api/notifications/clear-read
// @access  Private/Admin
exports.clearReadNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (req.user.role === 'admin') {
      // Admin hard-deletes read non-urgent, non-appeal notifications
      await Notification.deleteMany({
        readBy: userId,
        priority: { $nin: ['urgent', 'pinned'] },
        type: { $nin: ['appeal', 'sensitivity'] }
      });
      return res.status(200).json({ success: true, message: 'Read notifications cleared' });
    }
    // Non-admins get a graceful no-op (no error, but nothing happens)
    res.status(200).json({ success: true, message: 'No action taken' });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a notification (hard delete)
// @route   DELETE /api/notifications/:id
// @access  Private/Admin
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notification.deleteOne();

    // Broadcast deletion via socket so all connected clients remove it
    const io = req.app.get('io');
    if (io) {
      io.emit('notification:deleted', { id: req.params.id });
    }

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};
