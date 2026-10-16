const multer = require('multer');
const { AppError } = require('./errors');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new AppError(415, 'Only PDF files are allowed'));
    }
  },
});

// The multipart parser (busboy) reports a malformed request body as a plain Error with one of these fixed
// messages, which multer passes through untouched. They are client errors, so answer 400. Any other unexpected
// error still reaches the error handler as a real 500.
const MALFORMED_MULTIPART = /^(Multipart: |Malformed (part header|content type)|Unexpected end of (form|file)|Unsupported content type|Missing Content-Type)/;

const single = (field) => {
  const parse = upload.single(field);
  return (req, res, next) =>
    parse(req, res, (err) => {
      if (err && !(err instanceof AppError) && err.name !== 'MulterError' && MALFORMED_MULTIPART.test(err.message)) {
        return next(new AppError(400, 'Malformed multipart/form-data request'));
      }
      return next(err);
    });
};

module.exports = { single };
