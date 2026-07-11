const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - must be logged in
exports.protect = async (req, res, next) => {
  let token;

  // Read cookie first
  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }
  // Fallback to Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized - no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// Ensure user is email-verified
exports.verifiedOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  // Email verification check bypassed for all user roles
  next();
};

// Authorize roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

// Check if the user is currently blocked
exports.checkBlocked = async (req, res, next) => {
  if (!req.user) return next();

  const user = req.user;

  // If user is marked blocked
  if (user.isBlocked) {
    // Check if a timed block has expired
    if (user.blockedUntil && new Date() > new Date(user.blockedUntil)) {
      // Auto-unblock: clear the block
      user.isBlocked = false;
      user.blockedReason = '';
      user.blockedAt = undefined;
      user.blockedUntil = undefined;
      user.appealRequested = false;
      user.appealMessage = '';
      await user.save({ validateBeforeSave: false });
      return next();
    }

    const until = user.blockedUntil
      ? `until ${new Date(user.blockedUntil).toLocaleString()}`
      : 'indefinitely';

    return res.status(403).json({
      success: false,
      blocked: true,
      message: `Your account has been temporarily suspended ${until}.`,
      reason: user.blockedReason || 'Violation of community guidelines.',
      blockedUntil: user.blockedUntil || null,
      appealRequested: user.appealRequested || false,
    });
  }

  next();
};
