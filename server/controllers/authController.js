const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { generateOtp, sendEmailOtpCode, sendPhoneOtpCode } = require('../utils/otpService');

// In-memory OTP storage for registration / unauthenticated verification flows
const tempOtpStore = new Map();

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
      username: user.username || user.email?.split('@')[0] || 'student',
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      age: user.age,
      gender: user.gender,
      educationLevel: user.educationLevel,
      showRealNamePublicly: !!user.showRealNamePublicly,
      emailVerified: !!user.emailVerified,
      phoneVerified: !!user.phoneVerified,
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

// @desc    Check Username Availability
// @route   GET /api/auth/check-username/:username
// @access  Public
exports.checkUsernameAvailability = async (req, res, next) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ success: false, available: false, message: 'Username is required' });
    
    const cleanUsername = username.toLowerCase().trim();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ success: false, available: false, message: 'Username must be at least 3 characters long' });
    }
    
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return res.status(400).json({ success: false, available: false, message: 'Username can only contain letters, numbers, and underscores' });
    }

    const existing = await User.findOne({ username: cleanUsername });
    res.status(200).json({ success: true, available: !existing });
  } catch (err) {
    next(err);
  }
};

// @desc    Send Email OTP Code
// @route   POST /api/auth/send-email-otp
// @access  Public
exports.sendEmailOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email address is required' });
    
    const cleanEmail = email.toLowerCase().trim();
    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

    tempOtpStore.set(`email_${cleanEmail}`, { otp, expiresAt });

    try {
      await sendEmailOtpCode(cleanEmail, otp, 'Email Verification');
    } catch (e) {
      console.warn('Email OTP sending fallback (dev print):', e.message);
    }

    res.status(200).json({
      success: true,
      message: `Verification OTP generated for ${cleanEmail}`,
      otp: otp
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify Email OTP Code
// @route   POST /api/auth/verify-email-otp
// @access  Public
exports.verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP code are required' });

    const cleanEmail = email.toLowerCase().trim();
    const stored = tempOtpStore.get(`email_${cleanEmail}`);

    if (!stored || stored.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP has expired or was not requested. Please click resend.' });
    }

    if (stored.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please check and try again.' });
    }

    // Success
    tempOtpStore.delete(`email_${cleanEmail}`);
    res.status(200).json({ success: true, message: 'Email verified successfully!' });
  } catch (err) {
    next(err);
  }
};

// @desc    Send Phone OTP Code
// @route   POST /api/auth/send-phone-otp
// @access  Public
exports.sendPhoneOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Mobile phone number is required' });

    const cleanPhone = phone.replace(/\D/g, '');
    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    tempOtpStore.set(`phone_${cleanPhone}`, { otp, expiresAt });
    await sendPhoneOtpCode(phone, otp, 'Mobile Verification');

    res.status(200).json({
      success: true,
      message: `Mobile OTP code generated for ${phone}`,
      otp: otp
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify Phone OTP Code
// @route   POST /api/auth/verify-phone-otp
// @access  Public
exports.verifyPhoneOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone number and OTP code are required' });

    const cleanPhone = phone.replace(/\D/g, '');
    const stored = tempOtpStore.get(`phone_${cleanPhone}`);

    if (!stored || stored.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: 'Mobile OTP has expired or was not requested. Please click resend.' });
    }

    if (stored.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid Mobile OTP code.' });
    }

    tempOtpStore.delete(`phone_${cleanPhone}`);
    res.status(200).json({ success: true, message: 'Mobile phone verified successfully!' });
  } catch (err) {
    next(err);
  }
};

// @desc    Register user (4-Step Flow)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const {
      firstName, lastName, email, phone, university, academicMajor,
      yearOfStudy, password, username, age, gender, educationLevel,
      showRealNamePublicly, emailVerified, phoneVerified, securityQuestions
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = (username || cleanEmail.split('@')[0]).toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

    // Check uniqueness
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'Username is already taken. Please choose another.' });
    }

    const name = `${firstName || ''} ${lastName || ''}`.trim() || cleanUsername || 'Student';
    const safeRole = 'student';

    const formattedSecurityQuestions = Array.isArray(securityQuestions) ? securityQuestions.map(q => ({
      question: q.question,
      answer: q.answer ? q.answer.trim().toLowerCase() : ''
    })) : [];

    const user = await User.create({
      name,
      username: cleanUsername,
      email: cleanEmail,
      phone: phone || '',
      password,
      role: safeRole,
      age: age ? Number(age) : null,
      gender: gender || '',
      educationLevel: educationLevel || '',
      university: university || '',
      academicMajor: academicMajor || '',
      yearOfStudy: yearOfStudy || '',
      firstName: firstName || '',
      lastName: lastName || '',
      showRealNamePublicly: !!showRealNamePublicly,
      emailVerified: !!emailVerified,
      phoneVerified: !!phoneVerified,
      isVerified: !!emailVerified,
      securityQuestions: formattedSecurityQuestions,
      recommendationSettings: { preferredCategories: [], preferredTags: [] }
    });

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
    const {
      name, bio, firstName, lastName, university, phone, academicMajor,
      yearOfStudy, recommendationSettings, username, age, gender,
      educationLevel, showRealNamePublicly, securityQuestions, currentPassword
    } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (university !== undefined) updateData.university = university;
    if (phone !== undefined) updateData.phone = phone;
    if (academicMajor !== undefined) updateData.academicMajor = academicMajor;
    if (yearOfStudy !== undefined) updateData.yearOfStudy = yearOfStudy;
    if (age !== undefined) updateData.age = age ? Number(age) : null;
    if (gender !== undefined) updateData.gender = gender;
    if (educationLevel !== undefined) updateData.educationLevel = educationLevel;
    if (showRealNamePublicly !== undefined) updateData.showRealNamePublicly = showRealNamePublicly === true || showRealNamePublicly === 'true';

    // Handle security questions update (requires current password verification for safety)
    if (securityQuestions !== undefined) {
      let parsedQuestions = securityQuestions;
      if (typeof securityQuestions === 'string') {
        try { parsedQuestions = JSON.parse(securityQuestions); } catch (e) {}
      }

      if (Array.isArray(parsedQuestions) && parsedQuestions.length >= 2) {
        const currentUser = await User.findById(req.user.id).select('+password');
        if (!currentPassword || !(await currentUser.matchPassword(currentPassword))) {
          return res.status(401).json({ success: false, message: 'Incorrect Current Password. Security Questions were NOT updated.' });
        }

        updateData.securityQuestions = parsedQuestions.map(q => ({
          question: q.question,
          answer: q.answer ? q.answer.trim().toLowerCase() : ''
        }));
      }
    }

    if (username !== undefined && username.trim()) {
      const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
      const existing = await User.findOne({ username: cleanUsername, _id: { $ne: req.user.id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username is already in use' });
      }
      updateData.username = cleanUsername;
    }

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

// @desc    Request Password or Username Recovery OTP (via Email or Mobile Phone)
// @route   POST /api/auth/forgot-request
// @access  Public
exports.forgotRequest = async (req, res, next) => {
  try {
    const { recoveryType, contactMethod, contactValue } = req.body;
    if (!contactValue) {
      return res.status(400).json({ success: false, message: 'Please provide registered Email address or Phone number' });
    }

    const cleanVal = contactValue.trim().toLowerCase();
    const cleanPhone = contactValue.replace(/\D/g, '');
    const user = await User.findOne({
      $or: [
        { email: cleanVal },
        { phone: cleanVal },
        { phone: cleanPhone },
        { username: cleanVal }
      ]
    });
    const isEmail = contactMethod === 'email' || contactMethod === 'username' || contactValue.includes('@');
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found associated with this detail.' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user.resetOtp = otp;
    user.resetOtpExpire = expiresAt;
    await user.save({ validateBeforeSave: false });

    const purposeLabel = recoveryType === 'id' ? 'Account ID Recovery' : 'Password Reset';

    if (isEmail) {
      try {
        await sendEmailOtpCode(user.email, otp, purposeLabel);
      } catch (e) {
        console.warn('Email OTP Error:', e.message);
      }
    } else {
      await sendPhoneOtpCode(user.phone, otp, purposeLabel);
    }

    res.status(200).json({
      success: true,
      message: `OTP code generated for your ${isEmail ? 'email address' : 'mobile phone'}.`,
      otp: otp,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify Recovery OTP & Retrieve Account ID (Username)
// @route   POST /api/auth/verify-reset-otp
// @access  Public
exports.verifyResetOtp = async (req, res, next) => {
  try {
    const { contactValue, otp, recoveryType } = req.body;
    if (!contactValue || !otp) {
      return res.status(400).json({ success: false, message: 'Contact detail and OTP code are required' });
    }

    const isEmail = contactValue.includes('@');
    const query = isEmail
      ? { email: contactValue.toLowerCase().trim() }
      : { phone: contactValue.trim() };

    const user = await User.findOne({
      ...query,
      resetOtp: otp.trim(),
      resetOtpExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
    }

    if (recoveryType === 'id') {
      // Clear OTP after successful retrieval
      user.resetOtp = undefined;
      user.resetOtpExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(200).json({
        success: true,
        message: 'Account ID recovered successfully!',
        username: user.username || user.email.split('@')[0],
        email: user.email,
        name: user.name,
      });
    }

    res.status(200).json({ success: true, message: 'OTP verified. You can now set your new password.' });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset Password with verified OTP
exports.resetPassword = async (req, res, next) => {
  try {
    const { contactValue, newPassword, answers } = req.body;
    if (!contactValue || !newPassword) {
      return res.status(400).json({ success: false, message: 'Contact detail and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const cleanVal = contactValue.trim().toLowerCase();
    const cleanPhone = contactValue.replace(/\D/g, '');

    const user = await User.findOne({
      $or: [
        { email: cleanVal },
        { phone: cleanVal },
        { phone: cleanPhone },
        { username: cleanVal }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered user found with provided contact detail.' });
    }

    if (!user.securityQuestions || user.securityQuestions.length < 2) {
      return res.status(400).json({ success: false, message: 'Security Recovery Not Configured: This account has not set up 2 Security Questions. Password reset is blocked.' });
    }

    if (!answers || !Array.isArray(answers) || answers.length < 2) {
      return res.status(400).json({ success: false, message: '2 verified Security Question answers are strictly required to reset password.' });
    }

    let allMatch = true;
    for (const item of answers) {
      const match = user.securityQuestions.find(q => q.question === item.question);
      if (!match || match.answer !== item.answer.trim().toLowerCase()) {
        allMatch = false;
        break;
      }
    }

    if (!allMatch) {
      return res.status(400).json({ success: false, message: 'Security Question Answers do not match. Password reset blocked.' });
    }

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully! You can now log in.' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's configured security questions for recovery challenge
// @route   POST /api/auth/get-user-security-questions
// @access  Public
exports.getUserSecurityQuestions = async (req, res, next) => {
  try {
    const { contactValue } = req.body;
    if (!contactValue) return res.status(400).json({ success: false, message: 'Contact detail is required' });

    const cleanVal = contactValue.trim().toLowerCase();
    const cleanPhone = contactValue.replace(/\D/g, '');

    const user = await User.findOne({
      $or: [
        { email: cleanVal },
        { phone: cleanVal },
        { phone: cleanPhone },
        { username: cleanVal }
      ]
    });

    if (!user) return res.status(404).json({ success: false, message: 'No registered user found with this email or mobile phone.' });

    if (!user.securityQuestions || user.securityQuestions.length < 2) {
      return res.status(400).json({
        success: false,
        hasSecurityQuestions: false,
        message: 'Security Recovery Not Configured: This account has not set up 2 Security Questions. Account recovery is blocked.'
      });
    }

    const questions = user.securityQuestions.map(q => q.question);
    res.status(200).json({
      success: true,
      hasSecurityQuestions: true,
      questions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify answers to security questions for recovery
// @route   POST /api/auth/verify-security-questions
// @access  Public
exports.verifySecurityQuestions = async (req, res, next) => {
  try {
    const { contactValue, answers } = req.body;
    if (!contactValue) {
      return res.status(400).json({ success: false, message: 'Contact detail is required.' });
    }

    const cleanVal = contactValue.trim().toLowerCase();
    const cleanPhone = contactValue.replace(/\D/g, '');

    const user = await User.findOne({
      $or: [
        { email: cleanVal },
        { phone: cleanVal },
        { phone: cleanPhone },
        { username: cleanVal }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered user found with provided contact detail.' });
    }

    if (!user.securityQuestions || user.securityQuestions.length < 2) {
      return res.status(400).json({ success: false, message: 'Security Recovery Not Configured: This account has not set up 2 Security Questions. Recovery is blocked.' });
    }

    if (!answers || !Array.isArray(answers) || answers.length < 2) {
      return res.status(400).json({ success: false, message: '2 security question answers are required.' });
    }

    let allMatch = true;
    for (const item of answers) {
      const match = user.securityQuestions.find(q => q.question === item.question);
      if (!match || match.answer !== item.answer.trim().toLowerCase()) {
        allMatch = false;
        break;
      }
    }

    if (!allMatch) {
      return res.status(400).json({ success: false, message: 'Security Question Answers do not match. Recovery blocked.' });
    }

    res.status(200).json({
      success: true,
      verified: true,
      username: user.username || user.email.split('@')[0],
      email: user.email,
      name: user.name,
      message: 'Identity verified successfully!'
    });
  } catch (err) {
    next(err);
  }
};



