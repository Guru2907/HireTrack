const { AppError } = require('./errors');

// Parses req.body with a Zod schema and replaces it with the parsed (trimmed, typed, allow-listed) data.
// Controllers therefore only ever see validated input.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) return next(result.error);
  req.body = result.data;
  return next();
};

// Strict 24-hex check. mongoose.isValidObjectId also accepts numbers and 12-character strings.
const OBJECT_ID = /^[a-f\d]{24}$/i;

const validateObjectId = (param = 'id') => (req, res, next) => {
  if (!OBJECT_ID.test(String(req.params[param]))) return next(new AppError(400, `Invalid ${param}`));
  return next();
};

module.exports = { validate, validateObjectId };
