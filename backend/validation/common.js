const { z } = require('zod');

// Error text for a missing vs wrong-typed value, e.g. "Company is required" / "Company must be text".
const typeError = (label) => (issue) => (issue.input === undefined ? `${label} is required` : `${label} must be text`);

// A trimmed, non-empty string with a maximum length.
const requiredText = (label, max) =>
  z
    .string({ error: typeError(label) })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

// A trimmed string that may be empty (e.g. an untouched optional form field).
const optionalText = (label, max) =>
  z.string({ error: typeError(label) }).trim().max(max, `${label} must be at most ${max} characters`);

module.exports = { typeError, requiredText, optionalText };
