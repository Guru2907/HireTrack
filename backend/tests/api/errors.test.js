const request = require('supertest');
const app = require('../../app');
const Application = require('../../models/Application');
const db = require('../helpers/db');
const { createUser, authHeader } = require('../helpers/auth');

beforeAll(db.connect);
afterEach(async () => {
  jest.restoreAllMocks();
  await db.clear();
});
afterAll(db.close);

// A response is "safe" if it is JSON with a message and exposes no internals.
const expectSafeJsonError = (res, status) => {
  expect(res.status).toBe(status);
  expect(res.headers['content-type']).toMatch(/application\/json/);
  expect(typeof res.body.message).toBe('string');
  const text = JSON.stringify(res.body);
  expect(text).not.toMatch(/\bat\s+\S+\s+\(|node_modules|[A-Za-z]:\\|SyntaxError|MongoServerError|stack/);
};

describe('malformed requests', () => {
  test('malformed JSON returns a JSON 400, not an HTML error page', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": "a@b.com",');

    expectSafeJsonError(res, 400);
  });

  test('an oversized JSON body returns a JSON 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@b.com', password: 'x'.repeat(400 * 1024) }));

    expectSafeJsonError(res, 413);
  });

  test('a non-object JSON body is a 400 validation error, not a crash', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('"just a string"');

    expect([400]).toContain(res.status);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('unknown routes', () => {
  test.each([
    ['get', '/api/does-not-exist'],
    ['post', '/api/auth/does-not-exist'],
    ['delete', '/totally/unknown'],
  ])('%s %s returns a JSON 404', async (method, path) => {
    const res = await request(app)[method](path);

    expectSafeJsonError(res, 404);
  });

  test('unknown paths under a protected router return 401 without a token, JSON 404 with one', async () => {
    const { token } = await createUser();

    expectSafeJsonError(await request(app).post('/api/applications/extra/segments'), 401);
    expectSafeJsonError(await request(app).post('/api/applications/extra/segments').set(authHeader(token)), 404);
  });

  test('known routes with a wrong method also return a JSON 404', async () => {
    const { token } = await createUser();
    const res = await request(app).patch('/api/applications').set(authHeader(token));
    expectSafeJsonError(res, 404);
  });

  test('the health check still works', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('unexpected internal errors', () => {
  const leakyMessage = 'connect ECONNREFUSED mongodb://admin:hunter2@db.internal:27017/prod C:\\secret\\path.js';

  test('return a generic 500 and never leak the underlying message, stack or secrets', async () => {
    const { token } = await createUser();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Application, 'find').mockImplementation(() => {
      throw new Error(leakyMessage);
    });

    const res = await request(app).get('/api/applications').set(authHeader(token));

    expectSafeJsonError(res, 500);
    expect(res.body.message).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toMatch(/hunter2|mongodb:\/\/|ECONNREFUSED|secret/);
  });

  test('in production the response has no debug details at all', async () => {
    const { token } = await createUser();
    const previous = process.env.NODE_ENV;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Application, 'find').mockImplementation(() => {
      throw new Error(leakyMessage);
    });

    process.env.NODE_ENV = 'production';
    let res;
    try {
      res = await request(app).get('/api/applications').set(authHeader(token));
    } finally {
      process.env.NODE_ENV = previous;
    }

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Internal server error' });
  });

  test('only an explicit development run adds a debug field', async () => {
    const { token } = await createUser();
    const previous = process.env.NODE_ENV;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Application, 'find').mockImplementation(() => {
      throw new Error('visible only in development');
    });

    process.env.NODE_ENV = 'development';
    let res;
    try {
      res = await request(app).get('/api/applications').set(authHeader(token));
    } finally {
      process.env.NODE_ENV = previous;
    }

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Internal server error', debug: 'visible only in development' });
    expect(res.body).not.toHaveProperty('stack');
  });

  test('the error is logged server-side', async () => {
    const { token } = await createUser();
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Application, 'find').mockImplementation(() => {
      throw new Error(leakyMessage);
    });

    await request(app).get('/api/applications').set(authHeader(token));

    expect(logSpy).toHaveBeenCalled();
  });
});

describe('database errors are mapped safely', () => {
  test('a malformed ObjectId (CastError) is a 400, not a 500', async () => {
    const { token } = await createUser();
    const res = await request(app).delete('/api/applications/%7B%22a%22%3A1%7D').set(authHeader(token));

    expectSafeJsonError(res, 400);
    expect(res.body.message).not.toMatch(/cast|ObjectId/i);
  });
});
