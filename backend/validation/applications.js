const { z } = require('zod');
const { requiredText, optionalText } = require('./common');

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected']; // keep in sync with models/Application.js

const isHttpUrl = (value) => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

// The form sends '' for an untouched URL field, so '' is allowed; anything else must be an http(s) link
// (javascript:, data: and similar schemes are refused because job links get rendered as <a href>).
const jobUrl = optionalText('Job URL', 2048).refine((v) => v === '' || isHttpUrl(v), 'Job URL must be a valid http(s) link');

const appliedOn = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()], { error: 'Applied date must be a valid date' })
  .transform((value) => new Date(value));

// Allow-list taken from models/Application.js and what ApplicationsPage actually sends.
// strictObject: unknown or protected keys (user, _id, createdAt, __v, $set, ...) are rejected, not ignored.
const shape = {
  company: requiredText('Company', 200),
  role: requiredText('Role', 200),
  status: z.enum(STATUSES, { error: `Status must be one of: ${STATUSES.join(', ')}` }),
  jobUrl,
  notes: optionalText('Notes', 5000),
  appliedOn,
  resumeVersion: optionalText('Resume version', 200),
};

const createApplicationSchema = z.strictObject({
  company: shape.company,
  role: shape.role,
  status: shape.status.optional(),
  jobUrl: shape.jobUrl.optional(),
  notes: shape.notes.optional(),
  appliedOn: shape.appliedOn.optional(),
  resumeVersion: shape.resumeVersion.optional(),
});

const updateApplicationSchema = createApplicationSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

// The only fields a request may write; controllers copy exactly these (see controllers/applications.js).
const APPLICATION_FIELDS = Object.keys(shape);

module.exports = { createApplicationSchema, updateApplicationSchema, APPLICATION_FIELDS, STATUSES };
