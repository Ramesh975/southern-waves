const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  approveComment,
  deleteComment,
  getPendingComments,
  getMyComments,
} = require('../controllers/commentController');

router.get('/pending', protect, authorize('admin', 'editor'), getPendingComments);
router.get('/my-comments', protect, getMyComments);
router.put('/:id/approve', protect, authorize('admin', 'editor'), approveComment);
router.delete('/:id', protect, deleteComment);

module.exports = router;
