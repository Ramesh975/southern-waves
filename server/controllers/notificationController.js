const Notification = require('../models/Notification');

// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Private/Admin
exports.createNotification = async (req, res, next) => {
  try {
    const { title, message, type } = req.body;

    const notification = await Notification.create({
      title,
      message,
      type,
      sender: req.user.id,
      readBy: [],
    });

    await notification.populate('sender', 'name avatar');

    // Broadcast to all connected socket clients
    const io = req.app.get('io');
    if (io) {
      io.emit('notification:new', notification);
    }

    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find()
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 });

    // Map to include user-specific read status
    const data = notifications.map(n => {
      const isRead = n.readBy.includes(req.user.id);
      return {
        ...n.toObject(),
        isRead,
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
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

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Add userId to readBy for all notifications where it is not already present
    await Notification.updateMany(
      { readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private/Admin
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notification.deleteOne();
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};
