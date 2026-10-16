// Centralized error handling. Every API error leaves the server as
// { message, errors? } JSON. Anything we don't recognise becomes a generic 500;
// the real error is only logged server-side.
const { ZodError } = require('zod');

class AppError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (errors) this.errors = errors;
  }
}

// Express 4 does not forward rejected promises from async handlers; this does.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const notFound = (req, res) => res.status(404).json({ message: 'Route not found' });

const MONGOOSE_KIND_MESSAGES = {
  required: 'is required',
  enum: 'is not an allowed value',
  maxlength: 'is too long',
  minlength: 'is too short',
};

const zodToFieldErrors = (error) =>
  error.issues.flatMap((issue) => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({ field: key, message: `"${key}" is not an allowed field` }));
    }
    return [{ field: issue.path.length ? issue.path.join('.') : 'body', message: issue.message }];
  });

const validation = (errors) => ({ status: 400, message: errors[0].message, errors });

// Returns { status, body } for any thrown value. Never includes stack traces or driver text.
function describeError(err) {
  if (err instanceof AppError) {
    return { status: err.status, body: { message: err.message, ...(err.errors && { errors: err.errors }) } };
  }
  if (err instanceof ZodError) {
    const v = validation(zodToFieldErrors(err));
    return { status: v.status, body: { message: v.message, errors: v.errors } };
  }

  // body-parser (malformed JSON, body too large, unsupported encoding)
  if (err && typeof err.type === 'string' && err.type.startsWith('entity.')) {
    if (err.type === 'entity.too.large') return { status: 413, body: { message: 'Request body is too large' } };
    if (err.type === 'entity.parse.failed') return { status: 400, body: { message: 'Malformed JSON in request body' } };
    return { status: 400, body: { message: 'Invalid request body' } };
  }
  if (err && (err.type === 'encoding.unsupported' || err.type === 'charset.unsupported')) {
    return { status: 415, body: { message: 'Unsupported request encoding' } };
  }

  // Express could not decode a percent-encoded route parameter (e.g. /api/applications/%E0%A4%A).
  if (err instanceof URIError) {
    return { status: 400, body: { message: 'Malformed URL' } };
  }

  // multer (file uploads)
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') return { status: 413, body: { message: 'The file is too large (maximum 5 MB)' } };
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return { status: 400, body: { message: 'Unexpected file field' } };
    return { status: 400, body: { message: 'Invalid file upload' } };
  }

  // mongoose / MongoDB
  if (err && err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: `${e.path} ${MONGOOSE_KIND_MESSAGES[e.kind] || 'is invalid'}`,
    }));
    const v = validation(errors);
    return { status: v.status, body: { message: v.message, errors: v.errors } };
  }
  if (err && err.name === 'CastError') {
    return { status: 400, body: { message: `Invalid ${err.path === '_id' ? 'id' : err.path}` } };
  }
  if (err && err.code === 11000) {
    const message = err.keyPattern && err.keyPattern.email ? 'Email already registered' : 'That value is already in use';
    return { status: 409, body: { message } };
  }

  const body = { message: 'Internal server error' };
  // Only an explicit development run may echo the cause back to the client.
  if (process.env.NODE_ENV === 'development' && err && err.message) body.debug = String(err.message);
  return { status: 500, body };
}

// Must be registered last, with exactly four parameters.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const { status, body } = describeError(err);
  if (status >= 500) {
    // Method and path only: never log bodies or headers (they can hold passwords and tokens).
    console.error(`[error] ${req.method} ${req.originalUrl.split('?')[0]}`, err);
  }
  return res.status(status).json(body);
}

module.exports = { AppError, asyncHandler, notFound, errorHandler, describeError };
