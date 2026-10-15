const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const User = require('../../models/User');
const db = require('../helpers/db');
const { createUser, authHeader } = require('../helpers/auth');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('auth responses never expose password data', () => {
  test('signup and login return only token and name', async () => {
    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Sam', email: 'sam@example.com', password: 'password123' });
    expect(signup.status).toBe(201);
    expect(Object.keys(signup.body).sort()).toEqual(['name', 'token']);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sam@example.com', password: 'password123' });
    expect(Object.keys(login.body).sort()).toEqual(['name', 'token']);
  });

  test('PUT /api/auth/profile returns only the updated name', async () => {
    const { token } = await createUser();
    await request(app)
      .post('/api/resumes')
      .set(authHeader(token))
      .send({ label: 'Private', text: 'Private resume text' });

    const res = await request(app)
      .put('/api/auth/profile')
      .set(authHeader(token))
      .send({ name: '  New Name  ' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'New Name' });
  });
});

describe('protect middleware with a real token', () => {
  test('a valid token for a deleted user is rejected with 401, not a 500', async () => {
    const { token, email } = await createUser();
    await User.deleteOne({ email });

    const res = await request(app).get('/api/applications').set(authHeader(token));

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  test.each([
    ['malformed token', 'not.a.jwt'],
    ['token signed with the wrong secret', jwt.sign({ id: '507f1f77bcf86cd799439011' }, 'wrong-secret')],
  ])('%s gets a generic 401 message', async (_, token) => {
    const res = await request(app).get('/api/applications').set(authHeader(token));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Not authorized' });
  });
});
