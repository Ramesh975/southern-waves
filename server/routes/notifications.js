const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  deleteNotification,
  clearReadNotifications,
} = require('../controllers/notificationController');

const router = express.Router();

// All notification routes are protected
router.use(protect);

router.route('/')
  .get(getNotifications)
  .post(authorize('admin'), createNotification);

router.delete('/clear-read', clearReadNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.put('/:id/dismiss', dismissNotification);
router.delete('/:id', authorize('admin'), deleteNotification);

module.exports = router;
