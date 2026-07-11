const express = require('express'); // trigger nodemon reload
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { getAllowedOrigins, validateRuntimeConfig } = require('./config/runtime');
const { applySecurityHeaders, assignRequestId, enforceTrustedOrigin } = require('./middleware/security');
const { isAllowedChatRoom, isValidArticleId } = require('./utils/socketRooms');
const User = require('./models/User');

validateRuntimeConfig();
const allowedOrigins = getAllowedOrigins();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route files
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const commentRoutes = require('./routes/comments');
const newsletterRoutes = require('./routes/newsletter');
const rssRoutes = require('./routes/rss');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');
const filterRoutes = require('./routes/filters');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
app.disable('x-powered-by');
const io = socketio(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  }
});

// Expose io object in app
app.set('io', io);

const authRateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // limit each IP to 5 requests per windowMs (1000 in dev)
  message: { success: false, message: 'Too many requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
};

// Login failures are limited without penalizing successful sessions. Registration
// attempts are always counted to protect against automated account creation.
const loginLimiter = rateLimit({
  ...authRateLimitOptions,
  skipSuccessfulRequests: true,
});
const registrationLimiter = rateLimit(authRateLimitOptions);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(assignRequestId);
app.use(applySecurityHeaders);

// CORS - allow React dev server (MUST run before rate limiters and other handlers)
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(enforceTrustedOrigin(allowedOrigins));

// Apply targeted limits to public credential endpoints.
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registrationLimiter);

// Logger (dev mode)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/rss', rssRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/filters', filterRoutes);

const getSocketToken = (socket) => {
  const tokenFromAuth = socket.handshake.auth?.token;
  if (typeof tokenFromAuth === 'string' && tokenFromAuth) return tokenFromAuth;

  const cookieHeader = socket.handshake.headers.cookie || '';
  const accessToken = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith('access_token='));

  if (!accessToken) return null;

  try {
    return decodeURIComponent(accessToken.slice('access_token='.length));
  } catch (error) {
    return null;
  }
};

io.use(async (socket, next) => {
  try {
    const token = getSocketToken(socket);
    if (!token) return next(new Error('Authentication required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id name role isActive isBlocked');
    if (!user || !user.isActive) return next(new Error('Authentication required'));

    socket.data.user = { id: user.id, role: user.role, isBlocked: user.isBlocked };
    return next();
  } catch (error) {
    return next(new Error('Authentication required'));
  }
});

// Socket.io Connection
io.on('connection', (socket) => {
  console.log(`Socket connection established: ${socket.id}`);

  // Chat rooms (category / tag based)
  socket.on('chat:joinRoom', ({ room } = {}, callback) => {
    if (!isAllowedChatRoom(room)) {
      const result = { success: false, message: 'Invalid chat room' };
      if (typeof callback === 'function') callback(result);
      return socket.emit('socket:error', result);
    }

    socket.join(room);
    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('chat:leaveRoom', ({ room } = {}, callback) => {
    if (!isAllowedChatRoom(room)) {
      const result = { success: false, message: 'Invalid chat room' };
      if (typeof callback === 'function') callback(result);
      return socket.emit('socket:error', result);
    }

    socket.leave(room);
    if (typeof callback === 'function') callback({ success: true });
  });

  // Article comment rooms — join to receive real-time comment updates
  socket.on('article:joinRoom', ({ articleId } = {}, callback) => {
    if (!isValidArticleId(articleId)) {
      const result = { success: false, message: 'Invalid article identifier' };
      if (typeof callback === 'function') callback(result);
      return socket.emit('socket:error', result);
    }

    socket.join(`article:${articleId}`);
    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('article:leaveRoom', ({ articleId } = {}, callback) => {
    if (!isValidArticleId(articleId)) {
      const result = { success: false, message: 'Invalid article identifier' };
      if (typeof callback === 'function') callback(result);
      return socket.emit('socket:error', result);
    }

    socket.leave(`article:${articleId}`);
    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Southern Waves API is running 🌊', time: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🌊 Southern Waves Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
