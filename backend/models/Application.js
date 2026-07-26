const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company:       { type: String, required: true },
  role:          { type: String, required: true },
  status:        { type: String, enum: ['Applied', 'Interview', 'Offer', 'Rejected'], default: 'Applied' },
  jobUrl:        { type: String },
  notes:         { type: String },
  appliedOn:     { type: Date, default: Date.now },
  resumeVersion: { type: String }, // label of the resume (from User.resumes) sent for this application
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
