const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const User = require('../../models/User');
const db = require('../helpers/db');
const { createUser, authHeader } = require('../helpers/auth');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const signup = (body) => request(app).post('/api/auth/signup').send(body);
const login = (body) => request(app).post('/api/auth/login').send(body);
const good = { name: 'Sam', email: 'sam@example.com', password: 'password123' };

describe('signup validation', () => {
  test.each([
    ['missing everything', {}, 'email'],
    ['missing email', { name: 'Sam', password: 'password123' }, 'email'],
    ['invalid email', { ...good, email: 'not-an-email' }, 'email'],
    ['object email (operator injection)', { ...good, email: { $ne: null } }, 'email'],
    ['array email', { ...good, email: ['a@b.com'] }, 'email'],
    ['missing password', { name: 'Sam', email: 'sam@example.com' }, 'password'],
    ['empty password', { ...good, password: '' }, 'password'],
    ['too-short password', { ...good, password: '12345' }, 'password'],
    ['non-string password', { ...good, password: 123456 }, 'password'],
    ['missing name', { email: 'sam@example.com', password: 'password123' }, 'name'],
    ['blank name', { ...good, name: '   ' }, 'name'],
    ['object name', { ...good, name: { a: 1 } }, 'name'],
  ])('rejects %s with a field-level 400 and creates no user', async (_, body, field) => {
    const res = await signup(body);

    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.errors.map((e) => e.field)).toContain(field);
    expect(await User.countDocuments()).toBe(0);
  });

  test('success keeps the existing { token, name } contract and the JWT payload format', async () => {
    const res = await signup(good);

    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(['name', 'token']);
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'id']);
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
  });
});

describe('email normalization', () => {
  test('signup stores a trimmed, lowercased email and login accepts any case', async () => {
    const res = await signup({ ...good, email: '  Mixed@Example.COM ' });
    expect(res.status).toBe(201);
    expect((await User.findOne({}).lean()).email).toBe('mixed@example.com');

    expect((await login({ email: 'MIXED@example.com', password: good.password })).status).toBe(201);
    expect((await login({ email: ' mixed@example.com ', password: good.password })).status).toBe(201);
  });

  test('a legacy account stored with a mixed-case email can still log in', async () => {
    // Inserted straight into the collection, bypassing the schema, like a pre-existing row.
    await User.collection.insertOne({
      name: 'Legacy',
      email: 'Legacy@Example.com',
      password: await bcrypt.hash('password123', 4),
      resumes: [],
    });

    expect((await login({ email: 'legacy@example.com', password: 'password123' })).status).toBe(201);
    expect((await login({ email: 'LEGACY@EXAMPLE.COM', password: 'password123' })).status).toBe(201);
  });
});

describe('duplicate signup', () => {
  test('a second signup with the same email returns 409 and creates nothing', async () => {
    expect((await signup(good)).status).toBe(201);

    const res = await signup({ ...good, name: 'Other' });

    expect(res.status).toBe(409);
    expect(typeof res.body.message).toBe('string');
    expect(await User.countDocuments()).toBe(1);
  });

  test('a different-case duplicate is also rejected with 409', async () => {
    await signup(good);
    const res = await signup({ ...good, email: 'SAM@EXAMPLE.COM' });

    expect(res.status).toBe(409);
    expect(await User.countDocuments()).toBe(1);
  });

  test('a signup that collides with a legacy mixed-case account is rejected with 409', async () => {
    await User.collection.insertOne({
      name: 'Legacy',
      email: 'Legacy@Example.com',
      password: await bcrypt.hash('password123', 4),
      resumes: [],
    });

    const res = await signup({ ...good, email: 'legacy@example.com' });

    expect(res.status).toBe(409);
    expect(await User.countDocuments()).toBe(1);
  });

  test('two simultaneous signups with the same email: one 201, one 409, one user', async () => {
    const results = await Promise.all([signup(good), signup(good), signup(good)]);
    const statuses = results.map((r) => r.status).sort();

    expect(statuses).toEqual([201, 409, 409]);
    expect(await User.countDocuments()).toBe(1);
  });

  test('the email index is unique (what makes the race above safe)', async () => {
    const indexes = await User.collection.indexes();
    const emailIndex = indexes.find((i) => i.key.email === 1);
    expect(emailIndex).toMatchObject({ unique: true });
  });
});

describe('password byte limit (bcrypt silently truncates beyond 72 bytes)', () => {
  test('72 bytes is accepted, 73 bytes is rejected on signup', async () => {
    expect((await signup({ ...good, email: 'a@example.com', password: 'a'.repeat(72) })).status).toBe(201);

    const res = await signup({ ...good, email: 'b@example.com', password: 'a'.repeat(73) });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain('password');
  });

  test('the limit counts UTF-8 bytes, not characters', async () => {
    // 36 x "é" = 36 chars but 72 bytes (ok); 37 x "é" = 37 chars but 74 bytes (too long).
    expect((await signup({ ...good, email: 'c@example.com', password: 'é'.repeat(36) })).status).toBe(201);
    expect((await signup({ ...good, email: 'd@example.com', password: 'é'.repeat(37) })).status).toBe(400);
  });

  test('login does not reject long passwords, so legacy truncated-hash accounts still work', async () => {
    const longPassword = 'p'.repeat(90);
    await User.collection.insertOne({
      name: 'Old',
      email: 'old@example.com',
      password: await bcrypt.hash(longPassword, 4), // bcryptjs truncates this at 72 bytes
      resumes: [],
    });

    expect((await login({ email: 'old@example.com', password: longPassword })).status).toBe(201);
  });

  test('change-password rejects a new password over 72 bytes and keeps the old one working', async () => {
    const { token, email, password } = await createUser();

    const res = await request(app)
      .put('/api/auth/password')
      .set(authHeader(token))
      .send({ currentPassword: password, newPassword: 'n'.repeat(73) });

    expect(res.status).toBe(400);
    expect((await login({ email, password })).status).toBe(201);
  });

  test('change-password still enforces 6 characters, a wrong current password is a 400 (not 401)', async () => {
    const { token, email, password } = await createUser();
    const put = (body) => request(app).put('/api/auth/password').set(authHeader(token)).send(body);

    expect((await put({ currentPassword: password, newPassword: '12345' })).status).toBe(400);
    expect((await put({ currentPassword: 'wrong-password', newPassword: 'newpass123' })).status).toBe(400);
    expect((await put({ currentPassword: password, newPassword: 'newpass123' })).status).toBe(200);
    expect((await login({ email, password: 'newpass123' })).status).toBe(201);
  });
});

describe('login security', () => {
  test('success keeps the existing { token, name } contract', async () => {
    await signup(good);
    const res = await login({ email: good.email, password: good.password });

    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(['name', 'token']);
  });

  test('query-operator injection in the email cannot authenticate', async () => {
    await createUser({ email: 'victim@example.com', password: 'password123' });

    for (const email of [{ $ne: null }, { $gt: '' }, { $regex: '^victim' }, { $exists: true }]) {
      const res = await login({ email, password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.token).toBeUndefined();
    }
  });

  test('non-string passwords are rejected', async () => {
    await signup(good);
    for (const password of [{ $ne: null }, 123, null, ['x']]) {
      const res = await login({ email: good.email, password });
      expect(res.status).toBe(400);
      expect(res.body.token).toBeUndefined();
    }
  });

  test('unknown email and wrong password produce an identical 401 response', async () => {
    await signup(good);

    const wrongPassword = await login({ email: good.email, password: 'definitely-wrong' });
    const unknownEmail = await login({ email: 'nobody@example.com', password: 'definitely-wrong' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(JSON.stringify(wrongPassword.body)).not.toMatch(/not found|exist|registered/i);
  });

  test('missing fields give a 400 validation error (not an authentication answer)', async () => {
    expect((await login({})).status).toBe(400);
    expect((await login({ email: good.email })).status).toBe(400);
    expect((await login({ password: 'x' })).status).toBe(400);
  });

  test('the password hash is not selected by default on the model', async () => {
    await signup(good);
    const user = await User.findOne({ email: good.email });
    expect(user.password).toBeUndefined();
  });
});

describe('JWT handling', () => {
  test('an expired token gets a generic 401', async () => {
    const { token } = await createUser();
    const { id } = jwt.decode(token);
    const expired = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: -10 });

    const res = await request(app).get('/api/applications').set(authHeader(expired));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Not authorized' });
  });

  test('a token using alg "none" is rejected', async () => {
    const { token } = await createUser();
    const { id } = jwt.decode(token);
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id })}.`;

    const res = await request(app).get('/api/applications').set(authHeader(forged));

    expect(res.status).toBe(401);
  });

  test('a token for a deleted user is rejected on every protected route', async () => {
    const { token, email } = await createUser();
    await User.deleteOne({ email });

    for (const [method, path] of [
      ['get', '/api/applications'],
      ['get', '/api/resumes'],
      ['put', '/api/auth/profile'],
    ]) {
      const res = await request(app)[method](path).set(authHeader(token)).send({ name: 'x' });
      expect(res.status).toBe(401);
    }
  });
});
