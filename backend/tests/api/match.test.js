// The Gemini client is mocked: these tests never make a network call.
jest.mock('@google/genai', () => {
  const generateContent = jest.fn();
  return {
    GoogleGenAI: jest.fn(() => ({ models: { generateContent } })),
    __generateContent: generateContent,
  };
});

const request = require('supertest');
const genai = require('@google/genai');
const app = require('../../app');
const db = require('../helpers/db');
const { createUser, authHeader } = require('../helpers/auth');

const generateContent = genai.__generateContent;
const okResult = { score: 72, missingKeywords: ['Docker'], suggestions: ['a', 'b', 'c'] };
const reply = (value) => generateContent.mockResolvedValue({ text: typeof value === 'string' ? value : JSON.stringify(value) });
const match = (token, body) => request(app).post('/api/match').set(authHeader(token)).send(body);
const body = { resumeText: 'Built REST APIs with Node and MongoDB for two years.', jobDescription: 'We need a backend engineer with Node.' };

beforeAll(db.connect);
beforeEach(() => generateContent.mockReset());
afterEach(db.clear);
afterAll(db.close);

describe('POST /api/match input validation', () => {
  test.each([
    ['missing resumeText', { jobDescription: 'x' }, 'resumeText'],
    ['missing jobDescription', { resumeText: 'x' }, 'jobDescription'],
    ['empty strings', { resumeText: '', jobDescription: '' }, 'resumeText'],
    ['object resumeText', { resumeText: { a: 1 }, jobDescription: 'x' }, 'resumeText'],
    ['array jobDescription', { resumeText: 'x', jobDescription: ['x'] }, 'jobDescription'],
    ['over-long resumeText', { resumeText: 'r'.repeat(50001), jobDescription: 'x' }, 'resumeText'],
    ['over-long jobDescription', { resumeText: 'x', jobDescription: 'j'.repeat(20001) }, 'jobDescription'],
  ])('rejects %s with a 400 and never calls the AI provider', async (_, payload, field) => {
    const { token } = await createUser();

    const res = await match(token, payload);

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain(field);
    expect(generateContent).not.toHaveBeenCalled();
  });

  test('invalid requests do not use up the per-user rate-limit quota', async () => {
    const { token } = await createUser();
    reply(okResult);

    for (let i = 0; i < 12; i += 1) {
      expect((await match(token, { resumeText: '' })).status).toBe(400);
    }

    expect((await match(token, body)).status).toBe(200);
  });

  test('requires authentication', async () => {
    const res = await request(app).post('/api/match').send(body);
    expect(res.status).toBe(401);
    expect(generateContent).not.toHaveBeenCalled();
  });
});

describe('POST /api/match AI response handling', () => {
  test('returns a well-formed result unchanged (existing contract preserved)', async () => {
    const { token } = await createUser();
    reply(okResult);

    const res = await match(token, body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(okResult);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  test('accepts a reply wrapped in a ```json fence', async () => {
    const { token } = await createUser();
    reply('```json\n' + JSON.stringify(okResult) + '\n```');

    expect((await match(token, body)).status).toBe(200);
  });

  test.each([
    ['non-JSON text', 'I cannot help with that'],
    ['a fractional score', { ...okResult, score: 55.5 }],
    ['an out-of-range score', { ...okResult, score: 101 }],
    ['non-string keywords (would crash the UI)', { ...okResult, missingKeywords: [1, { a: 1 }] }],
    ['non-string suggestions', { ...okResult, suggestions: [null] }],
    ['a missing field', { score: 50, missingKeywords: [] }],
  ])('a provider reply with %s becomes a safe 502', async (_, value) => {
    const { token } = await createUser();
    reply(value);

    const res = await match(token, body);

    expect(res.status).toBe(502);
    expect(typeof res.body.message).toBe('string');
  });

  test('a provider failure becomes a 503 without leaking the provider error', async () => {
    const { token } = await createUser();
    generateContent.mockRejectedValue(new Error('429 quota exceeded for key AIzaSySECRET'));

    const res = await match(token, body);

    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toMatch(/AIza|quota|429/);
  });
});
