const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Application = require('../../models/Application');
const db = require('../helpers/db');
const { createUser, authHeader } = require('../helpers/auth');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const valid = { company: 'Acme', role: 'SDE Intern', status: 'Applied' };

const create = async (token, body = valid) => {
  const res = await request(app).post('/api/applications').set(authHeader(token)).send(body);
  expect(res.status).toBe(201);
  return res.body;
};

const stored = (id) => Application.findById(id).lean();

describe('POST /api/applications', () => {
  test('creates an application owned by the caller (existing contract preserved)', async () => {
    const { token } = await createUser();
    const res = await request(app)
      .post('/api/applications')
      .set(authHeader(token))
      .send({ company: ' Acme ', role: 'SDE', status: 'Interview', jobUrl: 'https://acme.com/jobs/1', notes: 'hi' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ company: 'Acme', role: 'SDE', status: 'Interview', jobUrl: 'https://acme.com/jobs/1', notes: 'hi' });
    expect(res.body._id).toBeDefined();
    expect(res.body.user).toBeDefined();
  });

  test('status defaults to Applied and empty jobUrl/notes are accepted (what the form sends)', async () => {
    const { token } = await createUser();
    const res = await request(app)
      .post('/api/applications')
      .set(authHeader(token))
      .send({ company: 'Acme', role: 'SDE', jobUrl: '', notes: '' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Applied');
  });

  test.each([
    ['missing company', { role: 'x' }, 'company'],
    ['blank company', { company: '   ', role: 'x' }, 'company'],
    ['missing role', { company: 'x' }, 'role'],
    ['invalid status (the old form placeholder)', { company: 'x', role: 'y', status: 'Choose your status' }, 'status'],
    ['non-string company', { company: { a: 1 }, role: 'y' }, 'company'],
    ['javascript: URL', { company: 'x', role: 'y', jobUrl: 'javascript:alert(1)' }, 'jobUrl'],
    ['data: URL', { company: 'x', role: 'y', jobUrl: 'data:text/html,hi' }, 'jobUrl'],
    ['oversized notes', { company: 'x', role: 'y', notes: 'n'.repeat(5001) }, 'notes'],
    ['invalid appliedOn', { company: 'x', role: 'y', appliedOn: 'not-a-date' }, 'appliedOn'],
  ])('rejects %s with a field-level 400 and stores nothing', async (_, body, field) => {
    const { token } = await createUser();
    const res = await request(app).post('/api/applications').set(authHeader(token)).send(body);

    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.errors.map((e) => e.field)).toContain(field);
    expect(await Application.countDocuments()).toBe(0);
  });

  test.each([
    ['user (ownership)', { user: new mongoose.Types.ObjectId().toString() }],
    ['_id', { _id: new mongoose.Types.ObjectId().toString() }],
    ['createdAt', { createdAt: '2000-01-01T00:00:00.000Z' }],
    ['__v', { __v: 99 }],
    ['an unknown field', { isAdmin: true }],
    ['a $-operator key', { $set: { status: 'Offer' } }],
  ])('rejects a body containing %s and stores nothing', async (_, extra) => {
    const { token } = await createUser();
    const res = await request(app)
      .post('/api/applications')
      .set(authHeader(token))
      .send({ ...valid, ...extra });

    expect(res.status).toBe(400);
    expect(await Application.countDocuments()).toBe(0);
  });
});

describe('PUT /api/applications/:id', () => {
  test('updates allowed fields (existing contract preserved)', async () => {
    const { token } = await createUser();
    const a = await create(token);

    const res = await request(app)
      .put(`/api/applications/${a._id}`)
      .set(authHeader(token))
      .send({ company: 'Acme', role: 'SDE', status: 'Offer', jobUrl: '', notes: 'signed' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ _id: a._id, status: 'Offer', notes: 'signed' });
    expect((await stored(a._id)).status).toBe('Offer');
  });

  test('supports a partial update', async () => {
    const { token } = await createUser();
    const a = await create(token);

    const res = await request(app).put(`/api/applications/${a._id}`).set(authHeader(token)).send({ status: 'Rejected' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ company: 'Acme', status: 'Rejected' });
  });

  test('rejects an invalid status and leaves the stored data unchanged', async () => {
    const { token } = await createUser();
    const a = await create(token);

    const res = await request(app).put(`/api/applications/${a._id}`).set(authHeader(token)).send({ status: 'Hired!!' });

    expect(res.status).toBe(400);
    expect((await stored(a._id)).status).toBe('Applied');
  });

  test('cannot reassign ownership via the body', async () => {
    const alice = await createUser();
    const bob = await createUser();
    const a = await create(alice.token);
    const bobDoc = await request(app).get('/api/applications').set(authHeader(bob.token));
    expect(bobDoc.body).toHaveLength(0);

    const res = await request(app)
      .put(`/api/applications/${a._id}`)
      .set(authHeader(alice.token))
      .send({ user: new mongoose.Types.ObjectId().toString() });

    expect(res.status).toBe(400);
    expect(String((await stored(a._id)).user)).toBe(String(a.user));
  });

  test.each([
    ['$unset of the owner', { $unset: { user: 1 } }],
    ['$set of the owner', { $set: { user: new mongoose.Types.ObjectId().toString() } }],
    ['$rename', { $rename: { company: 'x' } }],
    ['a dotted-path key', { 'user.x': 1 }],
    ['a nested operator in a field', { status: { $ne: 'Applied' } }],
  ])('rejects %s and leaves the stored data unchanged', async (_, body) => {
    const { token } = await createUser();
    const a = await create(token);
    const before = await stored(a._id);

    const res = await request(app).put(`/api/applications/${a._id}`).set(authHeader(token)).send(body);

    expect(res.status).toBe(400);
    expect(await stored(a._id)).toEqual(before);
  });

  test.each([
    ['empty body', {}],
    ['internal metadata', { createdAt: '2000-01-01T00:00:00.000Z' }],
    ['_id', { _id: new mongoose.Types.ObjectId().toString() }],
  ])('rejects %s and leaves the stored data unchanged', async (_, body) => {
    const { token } = await createUser();
    const a = await create(token);
    const before = await stored(a._id);

    const res = await request(app).put(`/api/applications/${a._id}`).set(authHeader(token)).send(body);

    expect(res.status).toBe(400);
    expect(await stored(a._id)).toEqual(before);
  });

  test('returns 400 for a malformed id and 404 for an unknown id', async () => {
    const { token } = await createUser();

    const bad = await request(app).put('/api/applications/not-an-id').set(authHeader(token)).send({ status: 'Offer' });
    expect(bad.status).toBe(400);

    const missing = await request(app)
      .put(`/api/applications/${new mongoose.Types.ObjectId()}`)
      .set(authHeader(token))
      .send({ status: 'Offer' });
    expect(missing.status).toBe(404);
  });
});

describe('DELETE /api/applications/:id', () => {
  test('deletes the caller\'s application (existing contract preserved)', async () => {
    const { token } = await createUser();
    const a = await create(token);

    const res = await request(app).delete(`/api/applications/${a._id}`).set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Successfully Deleted' });
    expect(await Application.countDocuments()).toBe(0);
  });

  test('returns 400 for a malformed id and 404 for an unknown id', async () => {
    const { token } = await createUser();

    expect((await request(app).delete('/api/applications/zzz').set(authHeader(token))).status).toBe(400);
    expect(
      (await request(app).delete(`/api/applications/${new mongoose.Types.ObjectId()}`).set(authHeader(token))).status,
    ).toBe(404);
  });
});

describe('application ownership', () => {
  test("a user's list only contains their own applications", async () => {
    const alice = await createUser();
    const bob = await createUser();
    await create(alice.token, { company: 'Alice Co', role: 'A', status: 'Applied' });
    await create(bob.token, { company: 'Bob Co', role: 'B', status: 'Applied' });

    const res = await request(app).get('/api/applications').set(authHeader(bob.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].company).toBe('Bob Co');
  });

  test("another user cannot update someone else's application", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const a = await create(alice.token);

    const res = await request(app).put(`/api/applications/${a._id}`).set(authHeader(bob.token)).send({ status: 'Rejected' });

    expect(res.status).toBe(404);
    expect((await stored(a._id)).status).toBe('Applied');
  });

  test("another user cannot delete someone else's application", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const a = await create(alice.token);

    const res = await request(app).delete(`/api/applications/${a._id}`).set(authHeader(bob.token));

    expect(res.status).toBe(404);
    expect(await stored(a._id)).not.toBeNull();
  });

  test('requests without a token are rejected', async () => {
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(401);
  });
});
