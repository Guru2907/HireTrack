const { createApplicationSchema, updateApplicationSchema, APPLICATION_FIELDS } = require('../../validation/applications');
const { signupSchema, loginSchema, changePasswordSchema } = require('../../validation/auth');
const { resumeSchema } = require('../../validation/resumes');
const { matchSchema } = require('../../validation/match');
const { describeError, AppError } = require('../../middleware/errors');
const { isValidMatchResult } = require('../../controllers/match');

const ok = (schema, value) => schema.safeParse(value);
const fields = (result) => result.error.issues.flatMap((i) => (i.code === 'unrecognized_keys' ? i.keys : [i.path.join('.')]));

describe('application schemas', () => {
  test('the allow-list matches the Mongoose schema fields the frontend sends', () => {
    expect(APPLICATION_FIELDS.sort()).toEqual(['appliedOn', 'company', 'jobUrl', 'notes', 'resumeVersion', 'role', 'status'].sort());
  });

  test('trims text and converts appliedOn to a Date', () => {
    const result = ok(createApplicationSchema, { company: '  Acme ', role: ' SDE ', appliedOn: '2025-03-01' });
    expect(result.success).toBe(true);
    expect(result.data.company).toBe('Acme');
    expect(result.data.appliedOn).toBeInstanceOf(Date);
  });

  test.each([
    ['https://example.com/jobs/1', true],
    ['http://example.com', true],
    ['', true],
    ['javascript:alert(1)', false],
    ['JAVASCRIPT:alert(1)', false],
    ['data:text/html,<script>', false],
    ['ftp://example.com', false],
    ['example.com/no-scheme', false],
    ['not a url', false],
  ])('jobUrl %j -> valid=%s', (jobUrl, expected) => {
    expect(ok(createApplicationSchema, { company: 'a', role: 'b', jobUrl }).success).toBe(expected);
  });

  test.each(['user', '_id', 'createdAt', 'updatedAt', '__v', '$set', '$unset', 'user.id'])('%s is not an allowed key', (key) => {
    const result = ok(createApplicationSchema, { company: 'a', role: 'b', [key]: 'x' });
    expect(result.success).toBe(false);
    expect(fields(result)).toContain(key);
  });

  test('update schema is partial, but never empty and never accepts unknown keys', () => {
    expect(ok(updateApplicationSchema, { status: 'Offer' }).success).toBe(true);
    expect(ok(updateApplicationSchema, {}).success).toBe(false);
    expect(ok(updateApplicationSchema, { user: 'x' }).success).toBe(false);
  });

  test('every status in the Mongoose enum is accepted and others are not', () => {
    for (const status of ['Applied', 'Interview', 'Offer', 'Rejected']) {
      expect(ok(createApplicationSchema, { company: 'a', role: 'b', status }).success).toBe(true);
    }
    expect(ok(createApplicationSchema, { company: 'a', role: 'b', status: 'applied' }).success).toBe(false);
  });
});

describe('auth schemas', () => {
  test('signup normalizes the email', () => {
    const result = ok(signupSchema, { name: ' Sam ', email: ' Sam@Example.COM ', password: 'password123' });
    expect(result.data).toEqual({ name: 'Sam', email: 'sam@example.com', password: 'password123' });
  });

  test('passwords are never trimmed or altered', () => {
    expect(ok(signupSchema, { name: 'a', email: 'a@b.co', password: '  spaced  ' }).data.password).toBe('  spaced  ');
  });

  test('the password limit is 72 UTF-8 bytes, measured in bytes not characters', () => {
    const attempt = (password) => ok(signupSchema, { name: 'a', email: 'a@b.co', password }).success;
    expect(attempt('a'.repeat(72))).toBe(true);
    expect(attempt('a'.repeat(73))).toBe(false);
    expect(attempt('é'.repeat(36))).toBe(true); // 72 bytes
    expect(attempt('é'.repeat(37))).toBe(false); // 74 bytes
    expect(attempt('😀'.repeat(18))).toBe(true); // 72 bytes
    expect(attempt('😀'.repeat(19))).toBe(false); // 76 bytes
  });

  test('login accepts passwords the signup rules would refuse (legacy accounts) but still needs a string', () => {
    expect(ok(loginSchema, { email: 'a@b.co', password: 'x'.repeat(200) }).success).toBe(true);
    expect(ok(loginSchema, { email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(ok(loginSchema, { email: 'a@b.co', password: '' }).success).toBe(false);
    expect(ok(loginSchema, { email: 'a@b.co', password: { $ne: 1 } }).success).toBe(false);
  });

  test('change-password keeps the 6-character minimum and applies the byte limit', () => {
    const attempt = (newPassword) => ok(changePasswordSchema, { currentPassword: 'old', newPassword });
    expect(attempt('12345').success).toBe(false);
    expect(attempt('123456').success).toBe(true);
    expect(attempt('x'.repeat(73)).success).toBe(false);
  });

  test('unknown keys are rejected', () => {
    expect(ok(loginSchema, { email: 'a@b.co', password: 'x', role: 'admin' }).success).toBe(false);
  });
});

describe('resume and match schemas', () => {
  test('resume schema trims and rejects extras', () => {
    expect(ok(resumeSchema, { label: ' a ', text: ' b ' }).data).toEqual({ label: 'a', text: 'b' });
    expect(ok(resumeSchema, { label: 'a', text: 'b', _id: 'x' }).success).toBe(false);
  });

  test('match schema enforces size limits', () => {
    expect(ok(matchSchema, { resumeText: 'r', jobDescription: 'j' }).success).toBe(true);
    expect(ok(matchSchema, { resumeText: 'r'.repeat(50001), jobDescription: 'j' }).success).toBe(false);
    expect(ok(matchSchema, { resumeText: 'r', jobDescription: 'j'.repeat(20001) }).success).toBe(false);
  });
});

describe('isValidMatchResult (AI output check)', () => {
  const good = { score: 50, missingKeywords: ['a'], suggestions: ['b'] };
  test('accepts integer scores and string lists, rejects everything else', () => {
    expect(isValidMatchResult(good)).toBe(true);
    expect(isValidMatchResult({ ...good, score: 50.5 })).toBe(false);
    expect(isValidMatchResult({ ...good, score: -1 })).toBe(false);
    expect(isValidMatchResult({ ...good, missingKeywords: [1] })).toBe(false);
    expect(isValidMatchResult({ ...good, suggestions: [{}] })).toBe(false);
    expect(isValidMatchResult({ ...good, suggestions: new Array(101).fill('x') })).toBe(false);
    expect(isValidMatchResult(null)).toBe(false);
  });
});

describe('describeError mapping', () => {
  test.each([
    ['AppError', new AppError(418, 'teapot'), 418, 'teapot'],
    ['body-parser parse error', Object.assign(new Error('x'), { type: 'entity.parse.failed' }), 400, 'Malformed JSON in request body'],
    ['body-parser too large', Object.assign(new Error('x'), { type: 'entity.too.large' }), 413, 'Request body is too large'],
    ['Multer file size', Object.assign(new Error('x'), { name: 'MulterError', code: 'LIMIT_FILE_SIZE' }), 413, 'The file is too large (maximum 5 MB)'],
    ['Multer other', Object.assign(new Error('x'), { name: 'MulterError', code: 'LIMIT_PART_COUNT' }), 400, 'Invalid file upload'],
    ['CastError', Object.assign(new Error('Cast to ObjectId failed for value "zz"'), { name: 'CastError', path: '_id' }), 400, 'Invalid id'],
    ['duplicate email', Object.assign(new Error('E11000 dup key ... secret'), { code: 11000, keyPattern: { email: 1 } }), 409, 'Email already registered'],
    ['duplicate other', Object.assign(new Error('E11000 dup key'), { code: 11000, keyPattern: { x: 1 } }), 409, 'That value is already in use'],
    ['unknown error', new Error('mongodb://user:pw@host failed'), 500, 'Internal server error'],
  ])('%s', (_, err, status, message) => {
    const described = describeError(err);
    expect(described.status).toBe(status);
    expect(described.body.message).toBe(message);
    expect(JSON.stringify(described.body)).not.toMatch(/secret|mongodb:\/\/|E11000|Cast to/);
  });

  test('Mongoose ValidationError becomes field-level 400 without driver text', () => {
    const err = Object.assign(new Error('Application validation failed: company: Path `company` is required.'), {
      name: 'ValidationError',
      errors: { company: { path: 'company', kind: 'required', message: 'Path `company` is required.' } },
    });
    const { status, body } = describeError(err);

    expect(status).toBe(400);
    expect(body.errors).toEqual([{ field: 'company', message: 'company is required' }]);
    expect(JSON.stringify(body)).not.toMatch(/Path `|validation failed/);
  });
});

describe('review regressions (schema / mapping level)', () => {
  test('D1: login accepts legacy email shapes and normalizes them; signup still enforces the strict format', () => {
    for (const email of ['test@test', 'a@b', 'Demo@LocalHost', 'user@127.0.0.1', '  x@y.z  ']) {
      const login = ok(loginSchema, { email, password: 'x' });
      expect(login.success).toBe(true);
      expect(login.data.email).toBe(email.trim().toLowerCase());
      expect(ok(signupSchema, { name: 'a', email, password: 'password123' }).success).toBe(false);
    }
    expect(ok(loginSchema, { email: '   ', password: 'x' }).success).toBe(false);
    expect(ok(loginSchema, { email: `${'a'.repeat(250)}@b.co`, password: 'x' }).success).toBe(false);
  });

  test('D2: lone surrogates are refused in every password field, valid pairs are not', () => {
    const lone = String.fromCharCode(0xd83d);
    const bad = [`${lone}abcdef`, `abcdef${lone}`, `abc${String.fromCharCode(0xde00)}def`, `ab${String.fromCharCode(0xde00)}${lone}cd`];
    for (const password of bad) {
      expect(ok(signupSchema, { name: 'a', email: 'a@b.co', password }).success).toBe(false);
      expect(ok(loginSchema, { email: 'a@b.co', password }).success).toBe(false);
      expect(ok(changePasswordSchema, { currentPassword: 'old', newPassword: password }).success).toBe(false);
      expect(ok(changePasswordSchema, { currentPassword: password, newPassword: 'newpass1' }).success).toBe(false);
    }
    const emoji = 'pw-😀-🔑-ok';
    expect(ok(signupSchema, { name: 'a', email: 'a@b.co', password: emoji }).success).toBe(true);
    expect(ok(loginSchema, { email: 'a@b.co', password: emoji }).success).toBe(true);
  });

  test('D2: the refusal message never echoes the password', () => {
    const result = ok(signupSchema, { name: 'a', email: 'a@b.co', password: `${String.fromCharCode(0xd83d)}SECRETTEXT` });
    expect(JSON.stringify(result.error.issues)).not.toMatch(/SECRETTEXT/);
  });

  test('D4: a URIError (Express failing to decode a route parameter) maps to a 400 without its message', () => {
    const err = new URIError("Failed to decode param '%E0%A4%A'");
    err.status = err.statusCode = 400;

    expect(describeError(err)).toEqual({ status: 400, body: { message: 'Malformed URL' } });
  });
});
