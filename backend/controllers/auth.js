const User = require('../models/User');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');

// TODO — Plan Phase 1, Step 6: hash password with bcrypt, create user, sign JWT (7d expiry)
exports.signup = async (req, res) => {
  res.status(501).json({ message: 'signup not implemented yet' });
};

// TODO — Plan Phase 1, Step 6: find user by email, compare password, sign JWT
exports.login = async (req, res) => {
  res.status(501).json({ message: 'login not implemented yet' });
};
