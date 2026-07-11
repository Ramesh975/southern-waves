const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');

const router = express.Router();

// All notifications routes are protected
router.use(protect);

router.route('/')
  .get(getNotifications)
  .post(authorize('admin'), createNotification);

router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', authorize('admin'), deleteNotification);

module.exports = router;
