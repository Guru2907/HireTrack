// Builds separate app instances with tiny limits, so each test has its own limiter state.
const request = require('supertest');
const { createApp } = require('../../app');
const User = require('../../models/User');
const db = require('../helpers/db');

beforeAll(db.connect);
afterEach(async () => {
  jest.restoreAllMocks();
  await db.clear();
});
afterAll(db.close);

const limiters = (login = 3, signup = 2) => {
  const { createLoginLimiter, createSignupLimiter } = require('../../middleware/authLimiter');
  return { loginLimiter: createLoginLimiter({ max: login }), signupLimiter: createSignupLimiter({ max: signup }) };
};

const ACCOUNT = { name: 'Sam', email: 'sam@example.com', password: 'password123' };
const wrongLogin = (app, headers = {}) =>
  request(app).post('/api/auth/login').set(headers).send({ email: ACCOUNT.email, password: 'wrong-password' });

describe('login rate limiting', () => {
  test('blocks further attempts with a generic 429 after the limit of failed logins', async () => {
    const app = createApp({ authLimiters: limiters(3) });
    await request(app).post('/api/auth/signup').send(ACCOUNT);

    for (let i = 0; i < 3; i += 1) expect((await wrongLogin(app)).status).toBe(401);
    const blocked = await wrongLogin(app);

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ message: 'Too many attempts. Please try again later.' });
    expect(blocked.headers).toHaveProperty('ratelimit-limit');
  });

  test('a blocked client cannot log in even with the correct password', async () => {
    const app = createApp({ authLimiters: limiters(2) });
    await request(app).post('/api/auth/signup').send(ACCOUNT);
    await wrongLogin(app);
    await wrongLogin(app);

    const res = await request(app).post('/api/auth/login').send({ email: ACCOUNT.email, password: ACCOUNT.password });

    expect(res.status).toBe(429);
    expect(res.body.token).toBeUndefined();
  });

  test('successful logins are not counted against the limit', async () => {
    const app = createApp({ authLimiters: limiters(2) });
    await request(app).post('/api/auth/signup').send(ACCOUNT);

    for (let i = 0; i < 6; i += 1) {
      const res = await request(app).post('/api/auth/login').send({ email: ACCOUNT.email, password: ACCOUNT.password });
      expect(res.status).toBe(201);
    }
  });

  test('malformed login attempts also count (they are failed requests)', async () => {
    const app = createApp({ authLimiters: limiters(2) });

    await request(app).post('/api/auth/login').send({});
    await request(app).post('/api/auth/login').send({});

    expect((await request(app).post('/api/auth/login').send({})).status).toBe(429);
  });

  test('each app instance has its own limiter state', async () => {
    const first = createApp({ authLimiters: limiters(1) });
    const second = createApp({ authLimiters: limiters(1) });

    await wrongLogin(first);
    expect((await wrongLogin(first)).status).toBe(429);
    expect((await wrongLogin(second)).status).toBe(401);
  });
});

describe('signup rate limiting', () => {
  test('limits signup attempts per client and creates no account once blocked', async () => {
    const app = createApp({ authLimiters: limiters(3, 2) });
    const signup = (n) => request(app).post('/api/auth/signup').send({ ...ACCOUNT, email: `u${n}@example.com` });

    expect((await signup(1)).status).toBe(201);
    expect((await signup(2)).status).toBe(201);
    const blocked = await signup(3);

    expect(blocked.status).toBe(429);
    expect(await User.countDocuments()).toBe(2);
  });
});

describe('password-change rate limiting (per signed-in user, failed attempts only)', () => {
  const { createLoginLimiter, createSignupLimiter, createPasswordLimiter } = require('../../middleware/authLimiter');
  const appWithPasswordLimit = (max) =>
    createApp({
      authLimiters: {
        loginLimiter: createLoginLimiter({ max: 100 }),
        signupLimiter: createSignupLimiter({ max: 100 }),
        passwordLimiter: createPasswordLimiter({ max }),
      },
    });
  const signup = async (app, email) => (await request(app).post('/api/auth/signup').send({ ...ACCOUNT, email })).body.token;
  const changePassword = (app, token, currentPassword, newPassword = 'new-password-456') =>
    request(app).put('/api/auth/password').set('Authorization', `Bearer ${token}`).send({ currentPassword, newPassword });

  test('blocks guessing the current password after the limit, even with the right one', async () => {
    const app = appWithPasswordLimit(3);
    const token = await signup(app, 'pw1@example.com');

    for (let i = 0; i < 3; i += 1) expect((await changePassword(app, token, 'wrong-guess')).status).toBe(400);
    const blocked = await changePassword(app, token, ACCOUNT.password);

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ message: 'Too many attempts. Please try again later.' });
    // The password was not changed while blocked.
    const login = await request(app).post('/api/auth/login').send({ email: 'pw1@example.com', password: ACCOUNT.password });
    expect(login.status).toBe(201);
  });

  test('successful changes are not counted', async () => {
    const app = appWithPasswordLimit(1);
    const token = await signup(app, 'pw2@example.com');
    let current = ACCOUNT.password;

    for (let i = 0; i < 4; i += 1) {
      const next = `rotated-password-${i}`;
      expect((await changePassword(app, token, current, next)).status).toBe(200);
      current = next;
    }
  });

  test('the limit is per user: one user being blocked does not affect another', async () => {
    const app = appWithPasswordLimit(1);
    const attacker = await signup(app, 'pw3@example.com');
    const victim = await signup(app, 'pw4@example.com');

    await changePassword(app, attacker, 'wrong-guess');
    expect((await changePassword(app, attacker, 'wrong-guess')).status).toBe(429);
    expect((await changePassword(app, victim, ACCOUNT.password)).status).toBe(200);
  });

  test('requests without a valid token are rejected by auth before the limiter', async () => {
    const app = appWithPasswordLimit(1);
    for (let i = 0; i < 3; i += 1) expect((await changePassword(app, 'not-a-token', 'x')).status).toBe(401);
  });
});

describe('proxy / X-Forwarded-For handling', () => {
  // express-rate-limit prints a configuration warning when X-Forwarded-For arrives without "trust proxy".
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));

  test('by default a spoofed X-Forwarded-For does NOT give an attacker a fresh bucket', async () => {
    const app = createApp({ authLimiters: limiters(2), trustProxy: false });

    expect((await wrongLogin(app, { 'X-Forwarded-For': '1.1.1.1' })).status).toBe(401);
    expect((await wrongLogin(app, { 'X-Forwarded-For': '2.2.2.2' })).status).toBe(401);
    expect((await wrongLogin(app, { 'X-Forwarded-For': '3.3.3.3' })).status).toBe(429);
  });

  test('with one trusted proxy hop, the proxy-reported client IP is used for the bucket', async () => {
    const app = createApp({ authLimiters: limiters(1), trustProxy: 1 });

    expect((await wrongLogin(app, { 'X-Forwarded-For': '10.0.0.1' })).status).toBe(401);
    expect((await wrongLogin(app, { 'X-Forwarded-For': '10.0.0.1' })).status).toBe(429);
    // A different real client (as reported by the trusted proxy) has its own bucket.
    expect((await wrongLogin(app, { 'X-Forwarded-For': '10.0.0.2' })).status).toBe(401);
  });

  test('with one trusted hop, client-supplied extra entries to the left cannot be used to evade the limit', async () => {
    // The trusted proxy appends the real client IP on the right. Anything the client puts to the left is ignored.
    const app = createApp({ authLimiters: limiters(1), trustProxy: 1 });

    expect((await wrongLogin(app, { 'X-Forwarded-For': '9.9.9.9, 10.0.0.1' })).status).toBe(401);
    expect((await wrongLogin(app, { 'X-Forwarded-For': '8.8.8.8, 10.0.0.1' })).status).toBe(429);
  });

  test('the default exported app trusts no proxy', () => {
    const app = require('../../app');
    expect(app.get('trust proxy')).toBe(false);
  });
});
