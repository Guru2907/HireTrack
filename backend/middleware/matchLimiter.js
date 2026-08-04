const rateLimit = require('express-rate-limit');

const matchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per user per window
  keyGenerator: (req) => req.user._id.toString(),
  message: { message: 'Too many match requests. Please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = matchLimiter;