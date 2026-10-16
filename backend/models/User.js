const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  // New emails are stored lowercase. Accounts created before this may be mixed-case, so lookups
  // fall back to a case-insensitive match (see controllers/auth.js). The unique index is unchanged.
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  // select:false -> the hash is never loaded unless a query asks for it with .select('+password').
  password: { type: String, required: true, select: false },
  resumes: [{
    label: String,       // e.g. "SDE Resume v2"
    text:  String,       // raw resume text used by the matcher
    uploadedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
