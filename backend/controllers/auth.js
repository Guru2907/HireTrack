const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError, asyncHandler } = require('../middleware/errors');

const BCRYPT_COST = 12;

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// `email` is already a validated, lowercased string (see validation/auth.js), so the filter below can only be
// an equality match: no client-supplied operator can reach the query.
// Accounts created before emails were lowercased may be stored mixed-case, so if the exact (index-backed)
// lookup misses, retry case-insensitively. No data is migrated.
const findUserByEmail = async (email, { withPassword = false } = {}) => {
  const exact = User.findOne({ email });
  if (withPassword) exact.select('+password');
  const user = await exact;
  if (user) return user;

  const legacy = User.findOne({ email }).collation({ locale: 'en', strength: 2 });
  if (withPassword) legacy.select('+password');
  return legacy;
};

// Compared against when the email is unknown, so "no such user" costs about the same time as "wrong password".
let dummyHash;
const getDummyHash = async () => {
  dummyHash = dummyHash || (await bcrypt.hash('hiretrack-timing-equaliser', BCRYPT_COST));
  return dummyHash;
};

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (await findUserByEmail(email)) throw new AppError(409, 'Email already registered');

  const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);
  // Two simultaneous signups can both pass the check above; the unique email index makes the loser fail with
  // E11000, which the error handler turns into the same 409.
  const newUser = await User.create({ name, email, password: hashedPassword });

  res.status(201).json({ token: signToken(newUser), name: newUser.name });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await findUserByEmail(email, { withPassword: true });
  const isMatch = await bcrypt.compare(password, existingUser ? existingUser.password : await getDummyHash());

  // One answer for "no such account" and "wrong password" so the response never reveals which emails exist.
  if (!existingUser || !isMatch) throw new AppError(401, 'Invalid email or password');

  res.status(201).json({ token: signToken(existingUser), name: existingUser.name });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { name: req.body.name },
    { new: true, runValidators: true },
  ).select('name');
  res.status(200).json({ name: updatedUser.name });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  // 400, not 401: the frontend treats any 401 as "session expired" and logs the user out.
  if (!isMatch) throw new AppError(400, 'Current password is incorrect');

  user.password = await bcrypt.hash(newPassword, BCRYPT_COST);
  await user.save();
  res.status(200).json({ message: 'Password updated successfully' });
});
