const express = require('express');
const { signup, login, updateProfile, changePassword } = require('../controllers/auth');
const protect = require('../middleware/protect');
const { validate } = require('../middleware/validate');
const { createLoginLimiter, createSignupLimiter } = require('../middleware/authLimiter');
const { signupSchema, loginSchema, profileSchema, changePasswordSchema } = require('../validation/auth');

// A factory so each app instance gets its own limiter state (and tests can use small limits).
module.exports = ({ loginLimiter = createLoginLimiter(), signupLimiter = createSignupLimiter() } = {}) => {
  const router = express.Router();

  router.post('/signup', signupLimiter, validate(signupSchema), signup);
  router.post('/login', loginLimiter, validate(loginSchema), login);
  router.put('/profile', protect, validate(profileSchema), updateProfile);
  router.put('/password', protect, validate(changePasswordSchema), changePassword);

  return router;
};
