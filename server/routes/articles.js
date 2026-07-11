const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize, verifiedOnly, checkBlocked } = require('../middleware/auth');
const {
  getArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  shareArticle,
  getTrending,
  getTrendingTags,
  getMostRead,
  likeArticle,
  dislikeArticle,
  getRecommendations,
  getMostLiked,
  getMyUploadsStats,
} = require('../controllers/articleController');
const { addComment, getComments } = require('../controllers/commentController');

// Optional auth middleware (populates req.user if token present but doesn't block)
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    next();
  }
};

router.get('/recommendations', optionalAuth, getRecommendations);
router.get('/most-read', getMostRead);
router.get('/most-liked', getMostLiked);
router.get('/trending', getTrending);
router.get('/tags/trending', getTrendingTags);
router.get('/', optionalAuth, getArticles);

// Stats for uploads - registered before parameterized :slug route
router.get('/my-uploads/stats', protect, getMyUploadsStats);

router.get('/:slug', getArticleBySlug);
router.post('/:id/share', shareArticle);

// Article CRUD (protected + blocked check)
router.post(
  '/',
  protect,
  checkBlocked,
  verifiedOnly,
  authorize('student', 'moderator', 'editor', 'admin'),
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]),
  createArticle
);
router.put(
  '/:id',
  protect,
  checkBlocked,
  authorize('student', 'moderator', 'editor', 'admin'),
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]),
  updateArticle
);
router.delete('/:id', protect, checkBlocked, authorize('student', 'moderator', 'editor', 'admin'), deleteArticle);

// Likes and Dislikes
router.post('/:id/like', protect, likeArticle); // Allowed even when blocked
router.post('/:id/dislike', protect, checkBlocked, dislikeArticle); // Blocked

// Comments nested under articles
router.get('/:articleId/comments', getComments);
router.post('/:articleId/comments', protect, checkBlocked, addComment);

module.exports = router;
