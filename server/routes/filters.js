const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getFilterWords,
  getDefaultWords,
  addFilterWord,
  updateFilterWord,
  deleteFilterWord,
  getFlaggedArticles,
  getPendingArticles,
  approveArticle,
  lockArticle,
  banArticle,
  dismissFlaggedArticle,
  getBlockedTags,
  addBlockedTag,
  deleteBlockedTag,
  getSystemSettings,
  updateSystemSettings,
  toggleContentSecurity,
} = require('../controllers/filterController');

const modAuth = [protect, authorize('admin', 'moderator')];

// Blocked tags management
router.get('/tags', ...modAuth, getBlockedTags);
router.post('/tags', ...modAuth, addBlockedTag);
router.delete('/tags/:id', ...modAuth, deleteBlockedTag);

// Global System settings (Security Locks)
router.get('/settings', ...modAuth, getSystemSettings);
router.put('/settings', protect, authorize('admin'), updateSystemSettings);

// Custom filter word management
router.get('/', ...modAuth, getFilterWords);
router.get('/defaults', ...modAuth, getDefaultWords);
router.post('/', ...modAuth, addFilterWord);
router.put('/:id', ...modAuth, updateFilterWord);
router.delete('/:id', ...modAuth, deleteFilterWord);

// Moderation queue
router.get('/flagged', ...modAuth, getFlaggedArticles);
router.get('/pending', ...modAuth, getPendingArticles);

// Article moderation actions
router.put('/articles/:id/approve', ...modAuth, approveArticle);
router.put('/articles/:id/lock', ...modAuth, lockArticle);
router.put('/articles/:id/ban', ...modAuth, banArticle);
router.delete('/articles/:id', ...modAuth, dismissFlaggedArticle);

// Article-specific security locks
router.put('/articles/:id/security', protect, authorize('admin', 'editor', 'moderator'), toggleContentSecurity);

module.exports = router;
