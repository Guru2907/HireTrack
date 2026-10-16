const Application = require('../models/Application');
const { AppError, asyncHandler } = require('../middleware/errors');
const { APPLICATION_FIELDS } = require('../validation/applications');

// Copy only allow-listed, already-validated fields. Nothing else from the request reaches the database.
const pickAllowed = (body) =>
  Object.fromEntries(APPLICATION_FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

exports.getAll = asyncHandler(async (req, res) => {
  const applications = await Application.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(applications);
});

exports.create = asyncHandler(async (req, res) => {
  // `user` always comes from the verified token, never from the request body.
  const application = await Application.create({ ...pickAllowed(req.body), user: req.user._id });
  res.status(201).json(application);
});

// TODO — Plan Phase 3: emit Socket.io 'statusUpdate' event
exports.update = asyncHandler(async (req, res) => {
  const application = await Application.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: pickAllowed(req.body) },
    { new: true, runValidators: true },
  );
  if (!application) throw new AppError(404, 'Not found');
  res.json(application);
});

exports.remove = asyncHandler(async (req, res) => {
  const application = await Application.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!application) throw new AppError(404, 'Not found');
  res.status(200).json({ message: 'Successfully Deleted' });
});
