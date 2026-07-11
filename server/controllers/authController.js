const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const getAccessCookieOptions = () => ({
  expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
});

const getRefreshCookieOptions = () => ({
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
});

// Generate and set tokens in cookies
const sendTokenResponse = async (user, statusCode, res) => {
  const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || 'refresh_secret_fallback', { expiresIn: '7d' });

  // Save refresh token to user model
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('access_token', accessToken, getAccessCookieOptions());
  res.cookie('refresh_token', refreshToken, getRefreshCookieOptions());

  res.status(statusCode).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      isVerified: user.isVerified,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      university: user.university || '',
      phone: user.phone || '',
      academicMajor: user.academicMajor || '',
      yearOfStudy: user.yearOfStudy || '',
      recommendationSettings: user.recommendationSettings || { preferredCategories: [], preferredTags: [] }
    },
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, university, academicMajor, yearOfStudy, password, role } = req.body;

    const name = `${firstName || ''} ${lastName || ''}`.trim() || 'Student';

    // Default to student role for all registrations
    const safeRole = 'student';

    // Generate email verification token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const verificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
    const verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = await User.create({
      name,
      email,
      password,
      role: safeRole,
      isVerified: false,
      verificationToken,
      verificationTokenExpire,
      firstName: firstName || '',
      lastName: lastName || '',
      university: university || '',
      phone: phone || '',
      academicMajor: academicMajor || '',
      yearOfStudy: yearOfStudy || '',
      recommendationSettings: { preferredCategories: [], preferredTags: [] }
    });

    // Send verification email
    const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/verify/${rawVerificationToken}`;
    const emailBody = `
      <h1>Welcome to Southern Waves!</h1>
      <p>Please click the link below to verify your email address and activate your account:</p>
      <a href="${verifyUrl}" target="_blank">${verifyUrl}</a>
      <p>This verification link will expire in 24 hours.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Verify your Southern Waves email address',
        html: emailBody,
      });
    } catch (emailErr) {
      console.error('Email could not be sent:', emailErr);
      // Don't fail registration if email fails (for dev, print link), but indicate it
    }

    // Still send token response so they are registered/logged in (as unverified)
    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user / clear cookies
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // If user is resolved by protect middleware
    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        user.refreshToken = undefined;
        await user.save({ validateBeforeSave: false });
      }
    }

    res.cookie('access_token', 'none', {
      expires: new Date(Date.now() + 5 * 1000), // expire in 5 seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    });

    res.cookie('refresh_token', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const rToken = req.cookies.refresh_token;
    if (!rToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    const user = await User.findOne({ refreshToken: rToken });
    if (!user) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    // Verify token
    try {
      const decoded = jwt.verify(rToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret_fallback');
      if (decoded.id !== user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Invalid token mapping' });
      }

      // Generate new access token
      const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });

      res.cookie('access_token', accessToken, getAccessCookieOptions());
      res.status(200).json({ success: true, message: 'Token refreshed successfully' });
    } catch (err) {
      // Refresh token is expired or invalid
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(403).json({ success: false, message: 'Refresh token expired or invalid' });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Verify email address
// @route   GET /api/auth/verify/:token
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const verificationToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      verificationToken,
      verificationTokenExpire: { $gt: Date.now() },
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    if (!user) {
      // Redirect to login page with indicator of failure
      return res.redirect(`${clientUrl}/login?verified=false`);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Redirect to login page with indicator of success
    res.redirect(`${clientUrl}/login?verified=true`);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'savedArticles',
      populate: {
        path: 'author',
        select: 'name avatar'
      }
    });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/me
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio, firstName, lastName, university, phone, academicMajor, yearOfStudy, recommendationSettings } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (university !== undefined) updateData.university = university;
    if (phone !== undefined) updateData.phone = phone;
    if (academicMajor !== undefined) updateData.academicMajor = academicMajor;
    if (yearOfStudy !== undefined) updateData.yearOfStudy = yearOfStudy;

    // Handle recommendationSettings
    if (recommendationSettings !== undefined) {
      let parsedRec = recommendationSettings;
      if (typeof recommendationSettings === 'string') {
        try {
          parsedRec = JSON.parse(recommendationSettings);
        } catch (e) {
          // ignore or keep as is
        }
      }
      updateData.recommendationSettings = parsedRec;
    }

    // Reconstruct name if first/last name changed
    if (firstName !== undefined || lastName !== undefined) {
      const existingUser = await User.findById(req.user.id);
      const f = firstName !== undefined ? firstName : existingUser.firstName;
      const l = lastName !== undefined ? lastName : existingUser.lastName;
      updateData.name = `${f || ''} ${l || ''}`.trim() || existingUser.name;
    }

    if (req.file) {
      const { uploadToCloudinary } = require('../utils/cloudinary');
      updateData.avatar = await uploadToCloudinary(req.file);
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user role (admin only)
// @route   PUT /api/auth/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Save an article
// @route   POST /api/auth/me/saved/:articleId
// @access  Private
exports.saveArticle = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (user.savedArticles.includes(req.params.articleId)) {
      return res.status(400).json({ success: false, message: 'Article already saved' });
    }

    user.savedArticles.push(req.params.articleId);
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message: 'Article saved successfully', data: user.savedArticles });
  } catch (err) {
    next(err);
  }
};

// @desc    Unsave an article
// @route   DELETE /api/auth/me/saved/:articleId
// @access  Private
exports.unsaveArticle = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.savedArticles = user.savedArticles.filter(
      (id) => id.toString() !== req.params.articleId
    );
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message: 'Article unsaved successfully', data: user.savedArticles });
  } catch (err) {
    next(err);
  }
};

// @desc    Block a user (admin/moderator)
// @route   PUT /api/auth/users/:id/block
// @access  Private/Admin/Moderator
exports.blockUser = async (req, res, next) => {
  try {
    const { reason, duration } = req.body; // duration in hours, or 'forever'
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent blocking an admin
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot block an administrator.' });
    }

    let blockedUntil = null;
    if (duration && duration !== 'forever') {
      const hours = Number(duration);
      if (!isNaN(hours) && hours > 0) {
        blockedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
      }
    }

    user.isBlocked = true;
    user.blockedReason = reason || 'Violation of community guidelines.';
    user.blockedAt = new Date();
    user.blockedUntil = blockedUntil;
    user.appealRequested = false;
    user.appealMessage = '';
    await user.save({ validateBeforeSave: false });

    // Emit real-time status update to socket
    const io = req.app.get('io');
    if (io) {
      io.emit('user:status', {
        userId: user._id,
        isBlocked: true,
        blockedReason: user.blockedReason,
        blockedUntil: user.blockedUntil,
        appealRequested: false,
        appealMessage: '',
      });
    }

    res.status(200).json({
      success: true,
      message: `User blocked ${blockedUntil ? 'until ' + blockedUntil.toLocaleString() : 'indefinitely'}.`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Unblock a user (admin/moderator)
// @route   PUT /api/auth/users/:id/unblock
// @access  Private/Admin/Moderator
exports.unblockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isBlocked = false;
    user.blockedReason = '';
    user.blockedAt = undefined;
    user.blockedUntil = undefined;
    user.appealRequested = false;
    user.appealMessage = '';
    await user.save({ validateBeforeSave: false });

    // Emit real-time status update to socket
    const io = req.app.get('io');
    if (io) {
      io.emit('user:status', {
        userId: user._id,
        isBlocked: false,
        blockedReason: '',
        blockedUntil: null,
        appealRequested: false,
        appealMessage: '',
      });
    }

    res.status(200).json({ success: true, message: 'User unblocked successfully.', data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit an appeal (blocked user)
// @route   POST /api/auth/appeal
// @access  Private
exports.submitAppeal = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.isBlocked) {
      return res.status(400).json({ success: false, message: 'Your account is not blocked.' });
    }

    if (user.appealRequested) {
      return res.status(400).json({ success: false, message: 'You have already submitted an appeal.' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Appeal message is required.' });
    }

    user.appealRequested = true;
    user.appealMessage = message.trim();
    await user.save({ validateBeforeSave: false });

    // Create an appeal notification for moderators/admins
    const Notification = require('../models/Notification');
    const newNotification = await Notification.create({
      title: `Appeal from ${user.name}`,
      message: message.trim(),
      type: 'appeal',
      sender: user._id,
      readBy: [],
    });
    await newNotification.populate('sender', 'name avatar role');

    // Emit real-time status update to socket
    const io = req.app.get('io');
    if (io) {
      io.emit('user:status', {
        userId: user._id,
        isBlocked: user.isBlocked,
        blockedReason: user.blockedReason,
        blockedUntil: user.blockedUntil,
        appealRequested: true,
        appealMessage: user.appealMessage,
      });

      // Emit new notification event globally
      io.emit('notification:new', newNotification);
    }

    res.status(200).json({ success: true, message: 'Appeal submitted successfully. An administrator will review it shortly.' });
  } catch (err) {
    next(err);
  }
};


// @desc    Get all users with pending appeals (admin/moderator)
// @route   GET /api/auth/appeals
// @access  Private/Admin/Moderator
exports.getAppeals = async (req, res, next) => {
  try {
    const users = await User.find({ isBlocked: true, appealRequested: true }).sort({ blockedAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject a user appeal (admin/moderator)
// @route   PUT /api/auth/users/:id/reject-appeal
// @access  Private/Admin/Moderator
exports.rejectAppeal = async (req, res, next) => {
  try {
    const { response } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.appealRequested = false;
    user.blockedReason = `Suspension maintained: ${response || 'Your appeal was reviewed and rejected.'}`;
    await user.save({ validateBeforeSave: false });

    // Emit real-time status update to socket so user gets the rejection message instantly
    const io = req.app.get('io');
    if (io) {
      io.emit('user:status', {
        userId: user._id,
        isBlocked: user.isBlocked,
        blockedReason: user.blockedReason,
        blockedUntil: user.blockedUntil,
        appealRequested: false,
        appealMessage: '',
      });
    }

    res.status(200).json({ success: true, message: 'Appeal rejected and user notified.', data: user });
  } catch (err) {
    next(err);
  }
};


