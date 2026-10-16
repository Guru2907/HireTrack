const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company:       { type: String, required: true, trim: true, maxlength: 200 },
  role:          { type: String, required: true, trim: true, maxlength: 200 },
  status:        { type: String, enum: ['Applied', 'Interview', 'Offer', 'Rejected'], default: 'Applied' },
  jobUrl:        { type: String, trim: true, maxlength: 2048 },
  notes:         { type: String, maxlength: 5000 },
  appliedOn:     { type: Date, default: Date.now },
  resumeVersion: { type: String, maxlength: 200 }, // label of the resume (from User.resumes) sent for this application
}, { timestamps: true });

// Every read is "this user's applications, newest first".
applicationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
