const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  updateProfile,
  getAllUsers,
  updateUserRole,
  logout,
  refreshToken,
  verifyEmail,
  saveArticle,
  unsaveArticle,
  blockUser,
  unblockUser,
  submitAppeal,
  getAppeals,
  rejectAppeal,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.get('/verify/:token', verifyEmail);
router.get('/me', protect, getMe);
router.put('/me', protect, upload.single('avatar'), updateProfile);
router.post('/me/saved/:articleId', protect, saveArticle);
router.delete('/me/saved/:articleId', protect, unsaveArticle);
router.get('/users', protect, authorize('admin', 'moderator'), getAllUsers);
router.put('/users/:id/role', protect, authorize('admin'), updateUserRole);

// Blocking / Appeals
router.put('/users/:id/block', protect, authorize('admin', 'moderator'), blockUser);
router.put('/users/:id/unblock', protect, authorize('admin', 'moderator'), unblockUser);
router.put('/users/:id/reject-appeal', protect, authorize('admin', 'moderator'), rejectAppeal);
router.post('/appeal', protect, submitAppeal);
router.get('/appeals', protect, authorize('admin', 'moderator'), getAppeals);

module.exports = router;

