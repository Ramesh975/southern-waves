const express = require('express'); // trigger nodemon reload
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketio = require('socket.io');
require('dotenv').config();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

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
const io = socketio(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  }
});

// Expose io object in app
app.set('io', io);

// Rate limiter for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // limit each IP to 5 requests per windowMs (1000 in dev)
  message: { success: false, message: 'Too many requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS - allow React dev server (MUST run before rate limiters and other handlers)
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Apply rate limiting (Disabled to prevent lockouts during deployment/testing)
// app.use('/api/auth/login', authLimiter);
// app.use('/api/auth/register', authLimiter);

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

// Socket.io Connection
io.on('connection', (socket) => {
  console.log(`Socket connection established: ${socket.id}`);

  // Chat rooms (category / tag based)
  socket.on('chat:joinRoom', ({ room }) => {
    if (room) {
      socket.join(room);
      console.log(`Socket ${socket.id} joined chat room: ${room}`);
    }
  });

  socket.on('chat:leaveRoom', ({ room }) => {
    if (room) {
      socket.leave(room);
      console.log(`Socket ${socket.id} left chat room: ${room}`);
    }
  });

  // Article comment rooms — join to receive real-time comment updates
  socket.on('article:joinRoom', ({ articleId }) => {
    if (articleId) {
      socket.join(`article:${articleId}`);
      console.log(`Socket ${socket.id} joined article room: article:${articleId}`);
    }
  });

  socket.on('article:leaveRoom', ({ articleId }) => {
    if (articleId) {
      socket.leave(`article:${articleId}`);
      console.log(`Socket ${socket.id} left article room: article:${articleId}`);
    }
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
