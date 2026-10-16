// Regression tests for the four defects (D1-D4) found in the independent Phase 2 review.
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const User = require('../../models/User');
const db = require('../helpers/db');
const { createUser, authHeader } = require('../helpers/auth');

beforeAll(db.connect);
afterEach(async () => {
  jest.restoreAllMocks();
  await db.clear();
});
afterAll(db.close);

const login = (body) => request(app).post('/api/auth/login').send(body);
const signup = (body) => request(app).post('/api/auth/signup').send(body);
const insertLegacyUser = async (email, password = 'password123') =>
  User.collection.insertOne({ name: 'Legacy', email, password: await bcrypt.hash(password, 4), resumes: [] });

// ---------------------------------------------------------------------------------------------
describe('D1: login accepts legacy email formats that the old HTML5 form allowed', () => {
  const LEGACY_EMAILS = ['test@test', 'a@b', 'demo@localhost', 'user@127.0.0.1', 'x@y.z'];

  test.each(LEGACY_EMAILS)('a legacy account %s can still log in', async (email) => {
    await insertLegacyUser(email);

    const res = await login({ email, password: 'password123' });

    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(['name', 'token']);
  });

  test('legacy login is trimmed and case-insensitive, including a mixed-case TLD-less email', async () => {
    await insertLegacyUser('Demo@Localhost');

    expect((await login({ email: 'demo@localhost', password: 'password123' })).status).toBe(201);
    expect((await login({ email: '  DEMO@LOCALHOST  ', password: 'password123' })).status).toBe(201);
  });

  test('a wrong password for a legacy account is the same generic 401 as an unknown email', async () => {
    await insertLegacyUser('test@test');

    const wrong = await login({ email: 'test@test', password: 'not-the-password' });
    const unknown = await login({ email: 'nobody@nowhere', password: 'not-the-password' });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  test.each([
    ['missing', undefined],
    ['empty', ''],
    ['whitespace only', '   '],
    ['number', 12345],
    ['array', ['a@b.co']],
    ['operator object', { $ne: null }],
    ['over 254 characters', `${'a'.repeat(250)}@b.co`],
  ])('login still rejects an email that is %s with a 400', async (_, email) => {
    await insertLegacyUser('test@test');

    const res = await login({ email, password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
    expect(res.body.errors.map((e) => e.field)).toContain('email');
  });

  test('signup validation is unchanged: a TLD-less email is still refused for new accounts', async () => {
    for (const email of LEGACY_EMAILS) {
      const res = await signup({ name: 'New', email, password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e) => e.field)).toContain('email');
    }
    expect(await User.countDocuments()).toBe(0);
  });

  test('duplicate-account handling is unchanged for a well-formed legacy email in a different case', async () => {
    await insertLegacyUser('Legacy@Example.com');

    const res = await signup({ name: 'New', email: 'legacy@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(await User.countDocuments()).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
describe('D2: passwords containing lone UTF-16 surrogates are refused with 400 before bcrypt runs', () => {
  const HIGH = String.fromCharCode(0xd83d);
  const LOW = String.fromCharCode(0xde00);
  const BAD_PASSWORDS = [
    ['a lone high surrogate', `${HIGH}abcdef`],
    ['a lone low surrogate', `abcdef${LOW}`],
    ['nothing but lone surrogates (long enough to pass the length rule)', HIGH.repeat(8)],
    ['a reversed (low, high) pair', `abcd${LOW}${HIGH}ef`],
    ['a high surrogate at the very end', `abcdef${HIGH}`],
  ];

  test.each(BAD_PASSWORDS)('signup with %s returns 400, creates nothing and logs no server error', async (_, password) => {
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await signup({ name: 'Sam', email: 'sam@example.com', password });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain('password');
    expect(JSON.stringify(res.body)).not.toContain('abcdef');
    expect(await User.countDocuments()).toBe(0);
    expect(logSpy).not.toHaveBeenCalled();
  });

  test.each(BAD_PASSWORDS)('login with %s returns 400 (not 500) and logs no server error', async (_, password) => {
    const { email } = await createUser();
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await login({ email, password });

    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('abcdef');
    expect(logSpy).not.toHaveBeenCalled();
  });

  test.each(BAD_PASSWORDS)('change-password with %s as the new password returns 400 and keeps the old password', async (_, bad) => {
    const { token, email, password } = await createUser();
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .put('/api/auth/password')
      .set(authHeader(token))
      .send({ currentPassword: password, newPassword: bad });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain('newPassword');
    expect((await login({ email, password })).status).toBe(201);
    expect(logSpy).not.toHaveBeenCalled();
  });

  test('change-password with a malformed current password returns 400, not 500', async () => {
    const { token } = await createUser();
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .put('/api/auth/password')
      .set(authHeader(token))
      .send({ currentPassword: `${HIGH}oldpass`, newPassword: 'newpass123' });

    expect(res.status).toBe(400);
    expect(logSpy).not.toHaveBeenCalled();
  });

  test('valid surrogate pairs (emoji) are still accepted everywhere', async () => {
    const emojiPassword = 'pass-😀-word-🔑';

    expect((await signup({ name: 'Emo', email: 'emo@example.com', password: emojiPassword })).status).toBe(201);
    const logged = await login({ email: 'emo@example.com', password: emojiPassword });
    expect(logged.status).toBe(201);

    const change = await request(app)
      .put('/api/auth/password')
      .set(authHeader(logged.body.token))
      .send({ currentPassword: emojiPassword, newPassword: 'new-😀-pass' });
    expect(change.status).toBe(200);
    expect((await login({ email: 'emo@example.com', password: 'new-😀-pass' })).status).toBe(201);
  });

  test('the server stays healthy after the bad inputs', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await signup({ name: 'Sam', email: 'sam@example.com', password: `${HIGH}abcdef` });

    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});

// ---------------------------------------------------------------------------------------------
describe('D3: malformed multipart/form-data requests get a JSON 400', () => {
  const upload = (token) => request(app).post('/api/resumes/upload').set(authHeader(token));
  const MALFORMED = [
    ['an invalid boundary with a non-multipart body', 'multipart/form-data; boundary=XYZ', 'garbage, not multipart'],
    ['a missing boundary', 'multipart/form-data', 'x'],
    ['a body cut off before the closing boundary', 'multipart/form-data; boundary=XYZ', '--XYZ\r\nContent-Disposition: form-data; name="label"\r\n\r\npartial value'],
    ['a malformed part header', 'multipart/form-data; boundary=XYZ', '--XYZ\r\nthis is not a header line\r\n\r\nvalue\r\n--XYZ--\r\n'],
  ];

  test.each(MALFORMED)('%s returns 400 as JSON, stores nothing and logs no server error', async (_, contentType, body) => {
    const { token, email } = await createUser();
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await upload(token).set('Content-Type', contentType).send(body);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ message: 'Malformed multipart/form-data request' });
    expect((await User.findOne({ email }).select('resumes')).resumes).toHaveLength(0);
    expect(logSpy).not.toHaveBeenCalled();
  });

  test('a missing token on a malformed upload is still a 401 (auth runs first)', async () => {
    const res = await request(app)
      .post('/api/resumes/upload')
      .set('Content-Type', 'multipart/form-data; boundary=XYZ')
      .send('garbage');

    expect(res.status).toBe(401);
  });

  test('existing upload errors keep their specific statuses', async () => {
    const { token } = await createUser();
    const pdf = { filename: 'a.pdf', contentType: 'application/pdf' };

    const wrongField = await upload(token).field('label', 'x').attach('resume', Buffer.from('%PDF-1.4'), pdf);
    expect(wrongField.status).toBe(400);
    expect(wrongField.body.message).toBe('Unexpected file field');

    const notPdf = await upload(token).field('label', 'x').attach('file', Buffer.from('hi'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(notPdf.status).toBe(415);

    const noFile = await upload(token).field('label', 'x');
    expect(noFile.status).toBe(400);
    expect(noFile.body.message).toMatch(/No PDF file/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('D4: malformed percent-encoded route parameters get a JSON 400', () => {
  const BAD_ENCODINGS = ['%E0%A4%A', '%', '%zz', '%C0%AF', '%FF'];

  test.each(BAD_ENCODINGS)('id %s on applications and resumes routes returns 400 and logs no server error', async (bad) => {
    const { token } = await createUser();
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const routes = [
      ['put', `/api/applications/${bad}`],
      ['delete', `/api/applications/${bad}`],
      ['put', `/api/resumes/${bad}`],
      ['delete', `/api/resumes/${bad}`],
    ];

    for (const [method, path] of routes) {
      const res = await request(app)[method](path).set(authHeader(token)).send({ status: 'Offer', label: 'a', text: 'b' });

      expect([method, path, res.status]).toEqual([method, path, 400]);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({ message: 'Malformed URL' });
    }
    expect(logSpy).not.toHaveBeenCalled();
  });

  test('without a token the request is still rejected with 401 first', async () => {
    const res = await request(app).delete('/api/applications/%E0%A4%A');
    expect(res.status).toBe(401);
  });

  test('a well-formed percent-encoded id is not affected by the new mapping', async () => {
    const { token } = await createUser();
    // %61 decodes to "a": a valid encoding, but not a 24-hex ObjectId, so the normal id check applies.
    const res = await request(app).delete('/api/applications/%61bc').set(authHeader(token));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid id');
  });
});
