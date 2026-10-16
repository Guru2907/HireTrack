// app.js — builds the Express app. No DB connection or listen() here, so tests can import it.
// Middleware order matters: parsers -> routes -> 404 -> error handler (always last).

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { getTrustProxy } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errors');
const createAuthRouter = require('./routes/auth');

// Defense in depth: if a query filter ever receives an object containing $-operators,
// Mongoose wraps it in $eq instead of executing it.
mongoose.set('sanitizeFilter', true);

// options.authLimiters lets tests supply small limits ({ loginLimiter, signupLimiter, passwordLimiter }).
function createApp(options = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Number of reverse proxies in front of the app, from TRUST_PROXY (default: none).
  // This is what decides whether X-Forwarded-For is believed; see config/env.js.
  app.set('trust proxy', 'trustProxy' in options ? options.trustProxy : getTrustProxy());

  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
  app.use(express.json({ limit: '256kb' }));

  // Routes
  app.use('/api/auth', createAuthRouter(options.authLimiters));
  app.use('/api/applications', require('./routes/applications'));
  app.use('/api/match', require('./routes/match'));
  app.use('/api/resumes', require('./routes/resumes'));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp();
module.exports.createApp = createApp;
