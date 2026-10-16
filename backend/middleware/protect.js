const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Invalid Request" });
  }
  const token = authHeader.split(' ')[1];

  // Only a bad, expired or tampered token is a 401. The frontend logs the user out on 401,
  // so a database failure below must not be reported as one.
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ message: "Not authorized" });
  }

  let Person;
  try {
    // Never expose the password hash or full resume texts through req.user;
    // handlers that need resumes or the password re-fetch the user themselves.
    Person = await User.findById(payload.id).select('-password -resumes');
  } catch (err) {
    // A token that verifies but carries a malformed id can only come from a leaked secret; still a 401.
    if (err?.name === 'CastError') return res.status(401).json({ message: "Not authorized" });
    return next(err); // e.g. MongoDB unavailable: central handler returns a generic 500
  }
  if (!Person) {
    return res.status(401).json({ message: "Not authorized" });
  }

  req.user = Person;
  next();
};
