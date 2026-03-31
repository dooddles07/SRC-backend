// server.js
// SRC Platform Backend — Main Entry Point

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');
const mongoose = require('mongoose');
const dns      = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

const { errorHandler } = require('./middleware/errorHandler');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const bookingRoutes      = require('./routes/booking');
const cancellationRoutes = require('./routes/cancellation');
const guestRoutes        = require('./routes/guest');
const walkinRoutes       = require('./routes/walkin');
const checkinRoutes      = require('./routes/checkin');
const chatbotRoutes      = require('./routes/chatbot');
const webhookRoutes      = require('./routes/webhook');
const pipelineRoutes     = require('./routes/pipeline');
const memberRoutes       = require('./routes/member');
const calendarRoutes     = require('./routes/calendar');
const staffRoutes        = require('./routes/staff');
const managementRoutes   = require('./routes/management');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
// In development, allow file:// (origin = null) and any localhost port.
// In production, restrict to ALLOWED_ORIGIN only.
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    // Allow file:// pages (browser opens index.html directly — origin is 'null' string)
    if (origin === 'null') return callback(null, true);
    // In development allow any localhost or 127.0.0.1 regardless of port
    if (process.env.NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Check explicit allow-list
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SRC Backend is running.',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',              authRoutes);
app.use('/api/booking',           bookingRoutes);
app.use('/api/cancellation',      cancellationRoutes);
app.use('/api/guest-registration', guestRoutes);
app.use('/api/walkin',            walkinRoutes);
app.use('/api/checkin',           checkinRoutes);
app.use('/api/chatbot',           chatbotRoutes);
app.use('/api/webhooks',          webhookRoutes);
app.use('/api/pipelines',         pipelineRoutes);
app.use('/api/member',            memberRoutes);
app.use('/api/calendars',         calendarRoutes);
app.use('/api/staff',             staffRoutes);
app.use('/api/management',        managementRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ SRC Backend running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

  // ── Self-ping every 15 minutes to keep the server alive ───────────────────
  const axios = require('axios');
  const PING_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  setInterval(async () => {
    try {
      await axios.get(`http://localhost:${PORT}/health`, { timeout: 5000 });
      console.log(`[Keep-alive] Server pinged at ${new Date().toISOString()}`);
    } catch (err) {
      console.warn(`[Keep-alive] Ping failed: ${err.message}`);
    }
  }, PING_INTERVAL_MS);
});

module.exports = app;
