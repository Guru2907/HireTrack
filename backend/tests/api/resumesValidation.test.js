const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const db = require('../helpers/db');
const { createUser, authHeader } = require('../helpers/auth');
const { makePdf } = require('../helpers/pdf');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const resumeCount = async (email) => (await User.findOne({ email }).select('resumes')).resumes.length;

const MINIMAL_PDF = makePdf('Hello Resume');

describe('POST /api/resumes validation', () => {
  test('adds a valid resume (existing contract: returns the resume array)', async () => {
    const { token } = await createUser();
    const res = await request(app).post('/api/resumes').set(authHeader(token)).send({ label: ' SDE v1 ', text: 'My resume' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ label: 'SDE v1', text: 'My resume' });
  });

  test.each([
    ['missing label', { text: 'x' }, 'label'],
    ['missing text', { label: 'x' }, 'text'],
    ['blank label', { label: '  ', text: 'x' }, 'label'],
    ['object label (operator injection)', { label: { $ne: 1 }, text: 'x' }, 'label'],
    ['numeric text', { label: 'x', text: 12345 }, 'text'],
    ['over-long label', { label: 'l'.repeat(101), text: 'x' }, 'label'],
    ['over-long text', { label: 'x', text: 't'.repeat(50001) }, 'text'],
  ])('rejects %s and stores nothing', async (_, body, field) => {
    const { token, email } = await createUser();

    const res = await request(app).post('/api/resumes').set(authHeader(token)).send(body);

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain(field);
    expect(await resumeCount(email)).toBe(0);
  });

  test('rejects client-supplied internal fields such as _id and uploadedAt', async () => {
    const { token, email } = await createUser();

    const res = await request(app)
      .post('/api/resumes')
      .set(authHeader(token))
      .send({ label: 'x', text: 'y', _id: '507f1f77bcf86cd799439011', uploadedAt: '2000-01-01' });

    expect(res.status).toBe(400);
    expect(await resumeCount(email)).toBe(0);
  });
});

describe('PUT /api/resumes/:id validation', () => {
  test('rejects over-long or non-string values and unknown fields, leaving the resume unchanged', async () => {
    const { token } = await createUser();
    const added = await request(app).post('/api/resumes').set(authHeader(token)).send({ label: 'keep', text: 'keep' });
    const id = added.body[0]._id;

    for (const body of [
      { label: 'x'.repeat(101), text: 'y' },
      { label: { $set: 1 }, text: 'y' },
      { label: 'x', text: 'y', uploadedAt: '2000-01-01' },
    ]) {
      const res = await request(app).put(`/api/resumes/${id}`).set(authHeader(token)).send(body);
      expect(res.status).toBe(400);
    }

    const list = await request(app).get('/api/resumes').set(authHeader(token));
    expect(list.body[0]).toMatchObject({ label: 'keep', text: 'keep' });
  });
});

describe('DELETE /api/resumes/:id', () => {
  test('a malformed id is a 400', async () => {
    const { token } = await createUser();
    const res = await request(app).delete('/api/resumes/not-an-id').set(authHeader(token));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/resumes/upload', () => {
  const upload = (token, { file, label = 'Uploaded', filename = 'resume.pdf', contentType = 'application/pdf' } = {}) => {
    const req = request(app).post('/api/resumes/upload').set(authHeader(token));
    if (label !== null) req.field('label', label);
    if (file) req.attach('file', file, { filename, contentType });
    return req;
  };

  test('extracts text from a valid PDF and stores it (existing contract: returns the resume array)', async () => {
    const { token } = await createUser();

    const res = await upload(token, { file: MINIMAL_PDF });

    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].label).toBe('Uploaded');
    expect(res.body[0].text).toMatch(/Hello Resume/);
  });

  test('no file is a 400', async () => {
    const { token } = await createUser();
    const res = await upload(token);
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  test('a missing label is a 400 and stores nothing', async () => {
    const { token, email } = await createUser();
    const res = await upload(token, { file: MINIMAL_PDF, label: null });

    expect(res.status).toBe(400);
    expect(await resumeCount(email)).toBe(0);
  });

  test('a non-PDF content type is a JSON 415 (not an HTML error page)', async () => {
    const { token, email } = await createUser();

    const res = await upload(token, { file: Buffer.from('plain text'), filename: 'resume.txt', contentType: 'text/plain' });

    expect(res.status).toBe(415);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(typeof res.body.message).toBe('string');
    expect(await resumeCount(email)).toBe(0);
  });

  test('a file over 5 MB is a JSON 413', async () => {
    const { token, email } = await createUser();
    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(5 * 1024 * 1024 + 1024, 0x20)]);

    const res = await upload(token, { file: big });

    expect(res.status).toBe(413);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(await resumeCount(email)).toBe(0);
  });

  test('a text file that claims to be a PDF (no %PDF- header) is rejected with 422', async () => {
    const { token, email } = await createUser();

    const res = await upload(token, { file: Buffer.from('I am not a pdf'), filename: 'fake.pdf' });

    expect(res.status).toBe(422);
    expect(await resumeCount(email)).toBe(0);
  });

  test('a corrupt file with a PDF header is rejected with 422 and no internals', async () => {
    const { token, email } = await createUser();

    const res = await upload(token, { file: Buffer.from('%PDF-1.4\n garbage garbage') });

    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).not.toMatch(/pdf\.js|node_modules|stack/i);
    expect(await resumeCount(email)).toBe(0);
  });

  test('an over-long label is rejected', async () => {
    const { token, email } = await createUser();
    const res = await upload(token, { file: MINIMAL_PDF, label: 'l'.repeat(101) });

    expect(res.status).toBe(400);
    expect(await resumeCount(email)).toBe(0);
  });
});
