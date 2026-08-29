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
  checkUsernameAvailability,
  sendEmailOtp,
  verifyEmailOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  forgotRequest,
  verifyResetOtp,
  resetPassword,
  getUserSecurityQuestions,
  verifySecurityQuestions,
  changePassword,
  deactivateAccount,
  adminSwitchAccount,
  adminRevertAccount,
  getAuthorProfile,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.get('/verify/:token', verifyEmail);

// Author Public/Studio Profile
router.get('/author/:identifier', getAuthorProfile);

// Password change & Deactivate
router.put('/change-password', protect, changePassword);
router.put('/me/deactivate', protect, deactivateAccount);

// Admin account switcher / impersonation
router.post('/admin/switch-account/:userId', protect, authorize('admin'), adminSwitchAccount);
router.post('/admin/revert-account', protect, adminRevertAccount);

// Username availability & OTP verification
router.get('/check-username/:username', checkUsernameAvailability);
router.post('/send-email-otp', sendEmailOtp);
router.post('/verify-email-otp', verifyEmailOtp);
router.post('/send-phone-otp', sendPhoneOtp);
router.post('/verify-phone-otp', verifyPhoneOtp);

// Recovery (Forgot Password / Account ID) & Security Questions Challenge
router.post('/forgot-request', forgotRequest);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);
router.post('/get-user-security-questions', getUserSecurityQuestions);
router.post('/verify-security-questions', verifySecurityQuestions);
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

