// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// TODO — Plan Phase 1, Step 7:
// 1. Read token from req.headers.authorization ("Bearer <token>")
// 2. jwt.verify it with process.env.JWT_SECRET
// 3. Load the user (minus password) onto req.user
// 4. next() if valid, 401 if not
module.exports = async (req, res, next) => {
  res.status(501).json({ message: 'protect middleware not implemented yet' });
};
