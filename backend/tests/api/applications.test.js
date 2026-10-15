// Ownership baseline: confirms application queries stay scoped to the authenticated user.
const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createUser, authHeader } = require('../helpers/auth');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const createApp = async (token, body = { company: 'Acme', role: 'SDE Intern', status: 'Applied' }) => {
  const res = await request(app).post('/api/applications').set(authHeader(token)).send(body);
  expect(res.status).toBe(201);
  return res.body;
};

describe('application ownership', () => {
  test("a user's list only contains their own applications", async () => {
    const alice = await createUser();
    const bob = await createUser();
    await createApp(alice.token, { company: 'Alice Co', role: 'A', status: 'Applied' });
    await createApp(bob.token, { company: 'Bob Co', role: 'B', status: 'Applied' });

    const res = await request(app).get('/api/applications').set(authHeader(bob.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].company).toBe('Bob Co');
  });

  test("another user cannot update someone else's application", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const aliceApp = await createApp(alice.token);

    const res = await request(app)
      .put(`/api/applications/${aliceApp._id}`)
      .set(authHeader(bob.token))
      .send({ status: 'Rejected' });

    expect(res.status).toBe(404);
    const aliceList = await request(app).get('/api/applications').set(authHeader(alice.token));
    expect(aliceList.body[0].status).toBe('Applied');
  });

  test("another user cannot delete someone else's application", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const aliceApp = await createApp(alice.token);

    const res = await request(app).delete(`/api/applications/${aliceApp._id}`).set(authHeader(bob.token));

    expect(res.status).toBe(404);
    const aliceList = await request(app).get('/api/applications').set(authHeader(alice.token));
    expect(aliceList.body).toHaveLength(1);
  });

  test('requests without a token are rejected', async () => {
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(401);
  });
});
