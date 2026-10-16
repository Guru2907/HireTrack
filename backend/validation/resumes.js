const { z } = require('zod');
const { requiredText } = require('./common');

const MAX_RESUME_TEXT = 50000;

const label = requiredText('Label', 100);
const text = requiredText('Resume text', MAX_RESUME_TEXT);

const resumeSchema = z.strictObject({ label, text }); // add + update (what ResumesPage sends)
const uploadSchema = z.object({ label }); // multipart form: only the label field is read

module.exports = { resumeSchema, uploadSchema, MAX_RESUME_TEXT };
