const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const db = require('../helpers/db');
const { createUser, authHeader } = require('../helpers/auth');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const addResume = async (token, body = { label: 'SDE v1', text: 'Original resume text' }) => {
  const res = await request(app).post('/api/resumes').set(authHeader(token)).send(body);
  expect(res.status).toBe(201);
  return res.body[res.body.length - 1];
};

describe('PUT /api/resumes/:id', () => {
  test('updates label and text and returns only the resume array', async () => {
    const { token } = await createUser();
    const resume = await addResume(token);

    const res = await request(app)
      .put(`/api/resumes/${resume._id}`)
      .set(authHeader(token))
      .send({ label: 'SDE v2', text: 'Updated resume text' });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ _id: resume._id, label: 'SDE v2', text: 'Updated resume text' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);

    const list = await request(app).get('/api/resumes').set(authHeader(token));
    expect(list.body[0]).toMatchObject({ label: 'SDE v2', text: 'Updated resume text' });
  });

  test('returns 404 for a resume id that does not exist', async () => {
    const { token } = await createUser();
    await addResume(token);

    const res = await request(app)
      .put(`/api/resumes/${new mongoose.Types.ObjectId()}`)
      .set(authHeader(token))
      .send({ label: 'x', text: 'y' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  test('returns 400 for a malformed resume id', async () => {
    const { token } = await createUser();

    const res = await request(app)
      .put('/api/resumes/not-an-id')
      .set(authHeader(token))
      .send({ label: 'x', text: 'y' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  test.each([
    [{ text: 'only text' }],
    [{ label: 'only label' }],
    [{ label: '   ', text: 'text' }],
    [{ label: 'label', text: '   ' }],
  ])('returns 400 when required fields are missing or blank: %j', async (body) => {
    const { token } = await createUser();
    const resume = await addResume(token);

    const res = await request(app).put(`/api/resumes/${resume._id}`).set(authHeader(token)).send(body);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});

describe('resume ownership', () => {
  test("another user cannot update or delete someone else's resume", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const aliceResume = await addResume(alice.token);

    const update = await request(app)
      .put(`/api/resumes/${aliceResume._id}`)
      .set(authHeader(bob.token))
      .send({ label: 'hijacked', text: 'hijacked' });
    expect(update.status).toBe(404);

    await request(app).delete(`/api/resumes/${aliceResume._id}`).set(authHeader(bob.token));

    const aliceList = await request(app).get('/api/resumes').set(authHeader(alice.token));
    expect(aliceList.body).toHaveLength(1);
    expect(aliceList.body[0]).toMatchObject({ label: 'SDE v1', text: 'Original resume text' });

    const bobList = await request(app).get('/api/resumes').set(authHeader(bob.token));
    expect(bobList.body).toHaveLength(0);
  });
});
