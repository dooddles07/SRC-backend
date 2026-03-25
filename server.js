// server.js
// SRC Platform Backend — Main Entry Point

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

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

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.ALLOWED_ORIGIN || '*',
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
});

module.exports = app;
