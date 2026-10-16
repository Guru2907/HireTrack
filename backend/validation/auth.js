const { z } = require('zod');
const { typeError, requiredText } = require('./common');

const MIN_PASSWORD_LENGTH = 6; // the policy changePassword already enforced; signup now matches it
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores everything after 72 UTF-8 bytes, so longer passwords are refused

const email = z
  .string({ error: typeError('Email') })
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address').max(254, 'Email must be at most 254 characters'));

// Login deliberately skips the strict format check. Accounts created before Phase 2 were never format-checked
// and the old HTML5 form accepted addresses like "test@test" or "me@localhost"; a strict rule here would lock
// those users out. It still needs a non-empty string of sane length, and is normalized exactly like signup so
// the lookup (exact, then case-insensitive for legacy mixed-case rows) behaves the same.
const loginEmail = z
  .string({ error: typeError('Email') })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(254, 'Email must be at most 254 characters');

const name = requiredText('Name', 100);

// A lone UTF-16 surrogate (a high surrogate without its low partner, or the reverse) is not valid text.
// bcryptjs throws on it, so refuse it up front instead of letting it surface as a 500. Valid pairs (emoji)
// are fine. This can never reject a real existing password: such a password could not have been hashed.
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const NO_LONE_SURROGATES = 'Password contains invalid characters';
const wellFormed = (value) => !LONE_SURROGATE.test(value);

// Used for new passwords (signup, change-password). Counts bytes, not characters: "é" is 2 bytes, emoji are 4.
const newPassword = (label) =>
  z
    .string({ error: typeError(label) })
    .min(MIN_PASSWORD_LENGTH, `${label} must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .refine(wellFormed, `${label} contains invalid characters`)
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES,
      `${label} is too long (maximum ${MAX_PASSWORD_BYTES} bytes; non-English characters and emoji use more than one byte each)`,
    );

// Login only checks the value is a well-formed string. It must not enforce the new-password length rules,
// otherwise accounts created before those rules existed (including >72-byte passwords) could no longer sign in.
const loginPassword = z
  .string({ error: typeError('Password') })
  .min(1, 'Password is required')
  .max(1024, 'Password is too long')
  .refine(wellFormed, NO_LONE_SURROGATES);

const signupSchema = z.strictObject({ name, email, password: newPassword('Password') });
const loginSchema = z.strictObject({ email: loginEmail, password: loginPassword });
const profileSchema = z.strictObject({ name });
const changePasswordSchema = z.strictObject({
  currentPassword: z
    .string({ error: typeError('Current password') })
    .min(1, 'Both current and new password are required')
    .max(1024, 'Current password is too long')
    .refine(wellFormed, 'Current password contains invalid characters'),
  newPassword: newPassword('New password'),
});

module.exports = {
  signupSchema,
  loginSchema,
  profileSchema,
  changePasswordSchema,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_BYTES,
};
