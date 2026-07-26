const Application = require('../models/Application');

// TODO — Plan Phase 1, Step 8: find all applications where user = req.user._id
exports.getAll = async (req, res) => {
  res.status(501).json({ message: 'getAll not implemented yet' });
};

// TODO — Plan Phase 1, Step 8: create application, attach req.user._id
exports.create = async (req, res) => {
  res.status(501).json({ message: 'create not implemented yet' });
};

// TODO — Plan Phase 1, Step 8 + Phase 3: update doc, then emit Socket.io 'statusUpdate' event
exports.update = async (req, res) => {
  res.status(501).json({ message: 'update not implemented yet' });
};

// TODO — Plan Phase 1, Step 8: findOneAndDelete scoped to req.user._id
exports.remove = async (req, res) => {
  res.status(501).json({ message: 'remove not implemented yet' });
};
