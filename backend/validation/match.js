const { z } = require('zod');
const { requiredText } = require('./common');
const { MAX_RESUME_TEXT } = require('./resumes');

const MAX_JOB_DESCRIPTION = 20000;

// Limits cap how much text can be forwarded to the metered AI provider per request.
const matchSchema = z.strictObject({
  resumeText: requiredText('Resume text', MAX_RESUME_TEXT),
  jobDescription: requiredText('Job description', MAX_JOB_DESCRIPTION),
});

module.exports = { matchSchema, MAX_JOB_DESCRIPTION };
