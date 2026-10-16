const rateLimit = require('express-rate-limit');

// Keyed on req.ip, which Express derives from the socket unless "trust proxy" is configured
// (see config/env.js). X-Forwarded-For is never read directly, so a client cannot choose its own bucket.

const positiveInt = (value, fallback) => (/^\d+$/.test(String(value)) && Number(value) > 0 ? Number(value) : fallback);

const tooMany = { message: 'Too many attempts. Please try again later.' };

// Counts failed logins only, so legitimate users are never throttled by their own successful sign-ins.
const createLoginLimiter = ({ windowMs = 15 * 60 * 1000, max = positiveInt(process.env.AUTH_LOGIN_MAX, 10) } = {}) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: tooMany,
  });

// Counts every signup attempt.
const createSignupLimiter = ({ windowMs = 60 * 60 * 1000, max = positiveInt(process.env.AUTH_SIGNUP_MAX, 10) } = {}) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany,
  });

module.exports = { createLoginLimiter, createSignupLimiter };
