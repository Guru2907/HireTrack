const request = require('supertest');
const app = require('../../app');

let counter = 0;

// Signs a new user up through the real API and returns its token.
exports.createUser = async (overrides = {}) => {
  counter += 1;
  const body = {
    name: `User ${counter}`,
    email: `user${counter}@example.com`,
    password: 'password123',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/signup').send(body);
  if (res.status !== 201) {
    throw new Error(`Signup failed in test helper: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, email: body.email, password: body.password };
};

exports.authHeader = (token) => ({ Authorization: `Bearer ${token}` });
