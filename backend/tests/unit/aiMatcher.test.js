// Offline tests for the Gemini -> Groq matcher orchestration. Providers are fakes, time is a fake clock
// and sleep is stubbed, so nothing touches the network or waits on real backoff delays.
const svc = require('../../services/aiMatcher');
const { isValidMatchResult } = require('../../controllers/match');

const { createMatcher, deps, classifyGeminiError, classifyGroqError, parseModelJson } = svc;

const SYSTEM = 'test system instruction';
const SECRET_INPUT = 'CONFIDENTIAL-RESUME-TEXT jane@example.com';
const UPSTREAM_TEXT = 'upstream says key AIzaSyLEAKED for project 1234';
const ok = { score: 72, missingKeywords: ['Docker'], suggestions: ['a', 'b', 'c'] };
const okText = JSON.stringify(ok);

// Error shapes copied from the installed SDKs: @google/genai ApiError (message = JSON body, numeric status)
// and groq-sdk APIError subclasses (status, headers, error body).
const geminiError = (status, body = {}) =>
  Object.assign(new Error(JSON.stringify({ error: { code: status, message: UPSTREAM_TEXT, ...body } })), { name: 'ApiError', status });
const gemini503 = () => geminiError(503, { status: 'UNAVAILABLE' });
const groqError = (status, { retryAfter, type = 'error', name = 'APIError' } = {}) =>
  Object.assign(new Error(`${status} ${UPSTREAM_TEXT}`), {
    name,
    status,
    headers: new Headers(retryAfter === undefined ? {} : { 'retry-after': String(retryAfter) }),
    error: { message: UPSTREAM_TEXT, type },
  });

let clock;
let logs;
const original = { ...deps };

beforeEach(() => {
  clock = 0;
  logs = [];
  deps.now = () => clock;
  deps.random = () => 0; // lowest jitter: backoff = 50% of each step
  deps.sleep = jest.fn(async (ms) => {
    clock += ms;
  });
  deps.log = (level, entry) => logs.push({ level, ...entry });
});
afterEach(() => Object.assign(deps, original));

// `steps` are what each successive call does: a string reply, an Error to throw, or a function.
function fakeProvider(role, steps = [], { configured = true, classify } = {}) {
  let call = 0;
  const generate = jest.fn(async (args) => {
    const step = steps[Math.min(call, steps.length - 1)];
    call += 1;
    if (typeof step === 'function') return step(args);
    if (step instanceof Error) throw step;
    return step;
  });
  return {
    role,
    name: role === 'primary' ? 'gemini' : 'groq',
    model: `${role}-model`,
    configured,
    classify: classify || (role === 'primary' ? classifyGeminiError : classifyGroqError),
    generate,
  };
}

const matcherWith = (primary, backup, policy) =>
  createMatcher({
    systemInstruction: SYSTEM,
    validate: isValidMatchResult,
    providers: () => [primary, backup].filter(Boolean),
    policy,
  });

describe('happy paths', () => {
  test('Gemini succeeds first time; Groq is never called', async () => {
    const primary = fakeProvider('primary', [okText]);
    const backup = fakeProvider('backup', [okText]);

    const out = await matcherWith(primary, backup)(SECRET_INPUT);

    expect(out).toEqual({ ok: true, result: ok, provider: 'primary', attempts: 1 });
    expect(backup.generate).not.toHaveBeenCalled();
    expect(deps.sleep).not.toHaveBeenCalled();
  });

  test('passes the system instruction and contents through unchanged, separately', async () => {
    const primary = fakeProvider('primary', [okText]);
    await matcherWith(primary)(SECRET_INPUT);
    const args = primary.generate.mock.calls[0][0];
    expect(args.systemInstruction).toBe(SYSTEM);
    expect(args.contents).toBe(SECRET_INPUT);
    expect(args.signal).toBeInstanceOf(AbortSignal);
  });

  test('a transient Gemini 503 is retried with backoff, then succeeds without fallback', async () => {
    const primary = fakeProvider('primary', [gemini503(), okText]);
    const backup = fakeProvider('backup', [okText]);

    const out = await matcherWith(primary, backup)('x');

    expect(out).toMatchObject({ ok: true, provider: 'primary', attempts: 2 });
    expect(primary.generate).toHaveBeenCalledTimes(2);
    expect(deps.sleep.mock.calls).toEqual([[500]]);
    expect(backup.generate).not.toHaveBeenCalled();
  });

  test('Gemini stays unavailable: 3 attempts, then Groq succeeds in the same call', async () => {
    const primary = fakeProvider('primary', [gemini503()]);
    const backup = fakeProvider('backup', [okText]);

    const out = await matcherWith(primary, backup)('x');

    expect(out).toEqual({ ok: true, result: ok, provider: 'backup', attempts: 4 });
    expect(primary.generate).toHaveBeenCalledTimes(3);
    expect(backup.generate).toHaveBeenCalledTimes(1);
    expect(deps.sleep.mock.calls).toEqual([[500], [1000]]);
    expect(logs.some((l) => l.event === 'fallback' && l.reason === 'unavailable')).toBe(true);
  });

  test('backoff uses exponential steps with jitter, capped', async () => {
    deps.random = () => 1; // highest jitter: full step
    const primary = fakeProvider('primary', [gemini503()]);
    await matcherWith(primary, null, { attempts: { primary: 5 }, deadlineMs: 1e9 })('x');
    expect(deps.sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000, 4000, 4000]);
  });

  test('network errors (no HTTP status) are retried and then fail over', async () => {
    const primary = fakeProvider('primary', [new TypeError('fetch failed')]);
    const backup = fakeProvider('backup', [okText]);
    const out = await matcherWith(primary, backup)('x');
    expect(out.provider).toBe('backup');
    expect(primary.generate).toHaveBeenCalledTimes(3);
  });
});

describe('non-retryable Gemini failures go straight to the backup', () => {
  test.each([
    ['401 unauthenticated', geminiError(401, { status: 'UNAUTHENTICATED' })],
    ['403 permission denied', geminiError(403, { status: 'PERMISSION_DENIED' })],
    ['404 unknown model', geminiError(404, { status: 'NOT_FOUND' })],
    [
      '400 invalid API key',
      geminiError(400, { status: 'INVALID_ARGUMENT', details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }] }),
    ],
  ])('%s: one Gemini attempt, no sleep, Groq succeeds', async (_, err) => {
    const primary = fakeProvider('primary', [err]);
    const backup = fakeProvider('backup', [okText]);

    const out = await matcherWith(primary, backup)('x');

    expect(out).toMatchObject({ ok: true, provider: 'backup' });
    expect(primary.generate).toHaveBeenCalledTimes(1);
    expect(deps.sleep).not.toHaveBeenCalled();
  });

  test('missing Gemini key: Gemini is skipped without a call and Groq answers', async () => {
    const primary = fakeProvider('primary', [okText], { configured: false });
    const backup = fakeProvider('backup', [okText]);

    const out = await matcherWith(primary, backup)('x');

    expect(out).toMatchObject({ ok: true, provider: 'backup', attempts: 1 });
    expect(primary.generate).not.toHaveBeenCalled();
    expect(logs).toContainEqual(expect.objectContaining({ event: 'provider_skipped', provider: 'gemini', reason: 'missing_api_key' }));
  });

  test('both keys missing: AI_CONFIGURATION_ERROR and no calls', async () => {
    const primary = fakeProvider('primary', [okText], { configured: false });
    const backup = fakeProvider('backup', [okText], { configured: false });

    const out = await matcherWith(primary, backup)('x');

    expect(out).toEqual({ ok: false, code: 'AI_CONFIGURATION_ERROR', attempts: 0 });
    expect(primary.generate).not.toHaveBeenCalled();
    expect(backup.generate).not.toHaveBeenCalled();
  });
});

describe('rate limits vs exhausted quota (conservative)', () => {
  const quotaFailure = (quotaId) => ({ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId }] });
  const retryInfo = (retryDelay) => ({ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay });

  test('a per-day QuotaFailure is quota_exhausted: no Gemini retry, Groq is tried', async () => {
    const err = geminiError(429, { status: 'RESOURCE_EXHAUSTED', details: [quotaFailure('GenerateRequestsPerDayPerProjectPerModel-FreeTier')] });
    expect(classifyGeminiError(err).category).toBe('quota_exhausted');

    const primary = fakeProvider('primary', [err]);
    const backup = fakeProvider('backup', [okText]);
    const out = await matcherWith(primary, backup)('x');

    expect(out.provider).toBe('backup');
    expect(primary.generate).toHaveBeenCalledTimes(1);
    expect(deps.sleep).not.toHaveBeenCalled();
  });

  test('a per-minute QuotaFailure is only a rate limit, never "exhausted"', () => {
    const err = geminiError(429, { status: 'RESOURCE_EXHAUSTED', details: [quotaFailure('GenerateRequestsPerMinutePerProjectPerModel')] });
    expect(classifyGeminiError(err).category).toBe('rate_limited');
  });

  test('a bare 429 with no details is a rate limit', () => {
    expect(classifyGeminiError(geminiError(429)).category).toBe('rate_limited');
    expect(classifyGroqError(groqError(429)).category).toBe('rate_limited');
  });

  test('a short Gemini RetryInfo delay is honoured exactly', async () => {
    const err = geminiError(429, { status: 'RESOURCE_EXHAUSTED', details: [retryInfo('2s')] });
    const primary = fakeProvider('primary', [err, okText]);
    const out = await matcherWith(primary, fakeProvider('backup', [okText]))('x');
    expect(out.provider).toBe('primary');
    expect(deps.sleep.mock.calls).toEqual([[2000]]);
  });

  test('a long RetryInfo delay is not waited for: fail over instead', async () => {
    const err = geminiError(429, { status: 'RESOURCE_EXHAUSTED', details: [retryInfo('35s')] });
    const primary = fakeProvider('primary', [err]);
    const backup = fakeProvider('backup', [okText]);
    const out = await matcherWith(primary, backup)('x');
    expect(out.provider).toBe('backup');
    expect(primary.generate).toHaveBeenCalledTimes(1);
    expect(deps.sleep).not.toHaveBeenCalled();
  });

  test('Groq Retry-After (seconds) is honoured within the cap', async () => {
    const primary = fakeProvider('primary', [geminiError(401)]);
    const backup = fakeProvider('backup', [groqError(429, { retryAfter: 1 }), okText]);
    const out = await matcherWith(primary, backup)('x');
    expect(out.provider).toBe('backup');
    expect(deps.sleep.mock.calls).toEqual([[1000]]);
  });

  test('every provider rate limited -> AI_RATE_LIMITED', async () => {
    const primary = fakeProvider('primary', [geminiError(429)]);
    const backup = fakeProvider('backup', [groqError(429, { retryAfter: 60 })]);
    const out = await matcherWith(primary, backup)('x');
    expect(out).toMatchObject({ ok: false, code: 'AI_RATE_LIMITED' });
    expect(backup.generate).toHaveBeenCalledTimes(1); // 60s Retry-After is over the cap
  });

  test('Gemini daily quota + Groq rate limit -> AI_RATE_LIMITED (the retryable answer wins)', async () => {
    const primary = fakeProvider('primary', [geminiError(429, { details: [quotaFailure('X-PerDay')] })]);
    const backup = fakeProvider('backup', [groqError(429, { retryAfter: 60 })]);
    expect((await matcherWith(primary, backup)('x')).code).toBe('AI_RATE_LIMITED');
  });

  test('only exhausted quota -> AI_QUOTA_EXHAUSTED', async () => {
    const primary = fakeProvider('primary', [geminiError(429, { details: [quotaFailure('X-PerDay')] })]);
    expect((await matcherWith(primary, null)('x')).code).toBe('AI_QUOTA_EXHAUSTED');
  });
});

describe('Groq failure classification', () => {
  test.each([
    [401, 'configuration'],
    [403, 'configuration'],
    [404, 'configuration'],
    [400, 'invalid_request'],
    [413, 'invalid_request'],
    [422, 'invalid_request'],
    [498, 'unavailable'],
    [500, 'unavailable'],
    [503, 'unavailable'],
  ])('HTTP %i -> %s', (status, category) => {
    expect(classifyGroqError(groqError(status)).category).toBe(category);
  });

  test('connection timeout / connection error classes', () => {
    expect(classifyGroqError(Object.assign(new Error('x'), { name: 'APIConnectionTimeoutError' })).category).toBe('timeout');
    expect(classifyGroqError(Object.assign(new Error('x'), { name: 'APIConnectionError' })).category).toBe('network');
  });

  test('Groq auth failure after Gemini outage -> AI_TEMPORARILY_UNAVAILABLE, no Groq retry', async () => {
    const primary = fakeProvider('primary', [gemini503()]);
    const backup = fakeProvider('backup', [groqError(401, { name: 'AuthenticationError' })]);
    const out = await matcherWith(primary, backup)('x');
    expect(out).toMatchObject({ ok: false, code: 'AI_TEMPORARILY_UNAVAILABLE', attempts: 4 });
    expect(backup.generate).toHaveBeenCalledTimes(1);
  });

  test('Groq transient failure is retried at most once (2 attempts)', async () => {
    const primary = fakeProvider('primary', [geminiError(403)]);
    const backup = fakeProvider('backup', [groqError(503)]);
    const out = await matcherWith(primary, backup)('x');
    expect(out).toMatchObject({ ok: false, code: 'AI_TEMPORARILY_UNAVAILABLE', attempts: 3 });
    expect(backup.generate).toHaveBeenCalledTimes(2);
  });
});

describe('backup disabled / not eligible', () => {
  test('no Groq key: Gemini outage returns AI_TEMPORARILY_UNAVAILABLE after Gemini retries', async () => {
    const primary = fakeProvider('primary', [gemini503()]);
    const backup = fakeProvider('backup', [okText], { configured: false });
    const out = await matcherWith(primary, backup)('x');
    expect(out).toEqual({ ok: false, code: 'AI_TEMPORARILY_UNAVAILABLE', attempts: 3 });
    expect(backup.generate).not.toHaveBeenCalled();
  });

  test('an invalid request (400) is not retried and does not fail over', async () => {
    const primary = fakeProvider('primary', [geminiError(400, { status: 'INVALID_ARGUMENT' })]);
    const backup = fakeProvider('backup', [okText]);
    const out = await matcherWith(primary, backup)('x');
    expect(out).toEqual({ ok: false, code: 'AI_REQUEST_FAILED', attempts: 1 });
    expect(backup.generate).not.toHaveBeenCalled();
  });
});

describe('model output handling', () => {
  test.each([
    ['non-JSON prose', 'Sure! Here is your analysis.'],
    ['missing text (undefined)', undefined],
    ['empty string', '   '],
    ['a JSON array', '[1,2,3]'],
    ['a fractional score', JSON.stringify({ ...ok, score: 55.5 })],
    ['a string score', JSON.stringify({ ...ok, score: '72' })],
    ['an out-of-range score', JSON.stringify({ ...ok, score: 101 })],
    ['non-string keywords', JSON.stringify({ ...ok, missingKeywords: [1, { a: 1 }] })],
    ['suggestions not an array', JSON.stringify({ ...ok, suggestions: 'do better' })],
    ['a missing field', JSON.stringify({ score: 50, missingKeywords: [] })],
  ])('Gemini %s is invalid output: no Gemini retry, Groq tried once', async (_, reply) => {
    const primary = fakeProvider('primary', [reply]);
    const backup = fakeProvider('backup', [okText]);

    const out = await matcherWith(primary, backup)('x');

    expect(out).toMatchObject({ ok: true, provider: 'backup' });
    expect(primary.generate).toHaveBeenCalledTimes(1);
  });

  test('invalid output from both providers -> AI_INVALID_OUTPUT after exactly one attempt each', async () => {
    const primary = fakeProvider('primary', ['not json']);
    const backup = fakeProvider('backup', [JSON.stringify({ ...ok, score: -1 })]);
    const out = await matcherWith(primary, backup)('x');
    expect(out).toEqual({ ok: false, code: 'AI_INVALID_OUTPUT', attempts: 2 });
  });

  test('extra model-generated properties are removed', async () => {
    const primary = fakeProvider('primary', [JSON.stringify({ ...ok, injected: '<script>', approved: true })]);
    const out = await matcherWith(primary)('x');
    expect(out.result).toEqual(ok);
    expect(Object.keys(out.result)).toEqual(['score', 'missingKeywords', 'suggestions']);
  });

  test('the existing validator is used unchanged (it does not enforce a suggestion count)', () => {
    // Special cases in the system prompt allow one suggestion (too little content) or
    // an explanation-only list (different field), so the count is a prompt rule, not a validator rule.
    expect(isValidMatchResult({ score: 0, missingKeywords: [], suggestions: ['Not enough content to evaluate.'] })).toBe(true);
    expect(isValidMatchResult({ score: 10, missingKeywords: [], suggestions: ['a', 'b', 'c'] })).toBe(true);
    expect(isValidMatchResult({ score: 10, missingKeywords: [], suggestions: Array(101).fill('a') })).toBe(false);
    expect(isValidMatchResult({ score: 10, missingKeywords: ['x'.repeat(1001)], suggestions: [] })).toBe(false);
  });
});

// Offline evaluation harness: synthetic resume/job pairs with replies in the shapes each provider is
// known to produce. It checks the contract and validation path for both providers; it says nothing
// about real model quality, which needs a manual live test with synthetic data.
describe('offline contract harness (synthetic data)', () => {
  const pairs = [
    { name: 'backend match', reply: '```json\n{"score":78,"missingKeywords":["Kubernetes"],"suggestions":["a","b","c"]}\n```', expect: 78 },
    { name: 'different field', reply: '{"score":8,"missingKeywords":[],"suggestions":["This role is in a different field."]}', expect: 8 },
    { name: 'too little content', reply: '{"score":0,"missingKeywords":[],"suggestions":["Not enough content to evaluate."]}', expect: 0 },
    { name: 'strong match, no gaps', reply: '{"score":95,"missingKeywords":[],"suggestions":["a","b","c"]}', expect: 95 },
    { name: 'fence without language tag', reply: '```\n{"score":40,"missingKeywords":["SQL"],"suggestions":["a","b","c"]}\n```', expect: 40 },
    { name: 'reasoning text before JSON', reply: 'Let me think... {"score":40,"missingKeywords":[],"suggestions":[]}', expect: null },
    { name: 'injected score as string', reply: '{"score":"100","missingKeywords":[],"suggestions":[]}', expect: null },
  ];

  test.each(['primary', 'backup'])('%s provider replies go through the same parser and validator', async (role) => {
    for (const pair of pairs) {
      const provider = fakeProvider(role, [pair.reply]);
      const out = await matcherWith(provider)('x');
      if (pair.expect === null) expect([pair.name, out.ok]).toEqual([pair.name, false]);
      else expect([pair.name, out.result.score]).toEqual([pair.name, pair.expect]);
    }
  });

  test('parseModelJson handles fences and rejects non-objects', () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseModelJson(null)).toBeNull();
    expect(parseModelJson('"just a string"')).toBeNull();
  });
});

describe('timeouts and deadlines', () => {
  test('a hung provider call is abandoned at the per-attempt timeout and classified as timeout', async () => {
    const primary = fakeProvider('primary', [() => new Promise(() => {})]);
    const backup = fakeProvider('backup', [okText]);

    const out = await matcherWith(primary, backup, {
      timeoutMs: { primary: 20 },
      minAttemptMs: 1,
      attempts: { primary: 1 },
    })('x');

    expect(out.provider).toBe('backup');
    expect(primary.generate.mock.calls[0][0].signal.aborted).toBe(true);
    expect(logs).toContainEqual(expect.objectContaining({ event: 'attempt_failed', provider: 'gemini', category: 'timeout' }));
  });

  test('a provider that throws after our abort is still a timeout', () => {
    expect(classifyGeminiError(Object.assign(new Error('aborted'), { name: 'AbortError' }), { timedOut: true }).category).toBe('timeout');
  });

  test('Gemini retries stop early enough to leave the backup its reserved time', async () => {
    // Each Gemini call burns 20s of the 50s deadline.
    const slow503 = () => {
      clock += 20000;
      throw gemini503();
    };
    const primary = fakeProvider('primary', [slow503]);
    const backup = fakeProvider('backup', [okText]);

    const out = await matcherWith(primary, backup)('x');

    expect(out.provider).toBe('backup');
    expect(primary.generate).toHaveBeenCalledTimes(2);
    expect(primary.generate.mock.calls.map(([a]) => a.timeoutMs)).toEqual([20000, 14500]);
    expect(backup.generate.mock.calls[0][0].timeoutMs).toBe(9500);
    expect(clock).toBeLessThanOrEqual(50000);
  });

  test('when the deadline is spent, no further attempt starts', async () => {
    const burnAll = () => {
      clock += 49000;
      throw gemini503();
    };
    const primary = fakeProvider('primary', [burnAll]);
    const backup = fakeProvider('backup', [okText]);
    const out = await matcherWith(primary, backup)('x');
    expect(out).toMatchObject({ ok: false, code: 'AI_TEMPORARILY_UNAVAILABLE', attempts: 1 });
    expect(backup.generate).not.toHaveBeenCalled();
  });

  test('total attempts are bounded even if every call fails forever', async () => {
    const primary = fakeProvider('primary', [gemini503()]);
    const backup = fakeProvider('backup', [groqError(503)]);
    const out = await matcherWith(primary, backup)('x');
    expect(out.attempts).toBe(5); // 3 Gemini + 2 Groq
    expect(deps.sleep).toHaveBeenCalledTimes(3);
  });
});

describe('safe diagnostics', () => {
  test('logs never contain input text, keys, upstream messages or bodies', async () => {
    const primary = fakeProvider('primary', [
      geminiError(429, { status: 'RESOURCE_EXHAUSTED', details: [{ '@type': 'x.QuotaFailure', violations: [{ quotaId: 'A-PerDay' }] }] }),
    ]);
    const backup = fakeProvider('backup', [groqError(503), `{"score":1,"missingKeywords":["${SECRET_INPUT}"],"extra":1}`]);

    await matcherWith(primary, backup)(SECRET_INPUT);

    const text = JSON.stringify(logs);
    expect(logs.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/CONFIDENTIAL|jane@|AIza|upstream says|LEAKED|test system instruction/);
    for (const entry of logs) {
      for (const key of ['message', 'stack', 'body', 'contents', 'error', 'headers']) expect(entry).not.toHaveProperty(key);
    }
  });

  test('a structured summary records the provider that completed and the attempt count', async () => {
    const out = await matcherWith(fakeProvider('primary', [gemini503()]), fakeProvider('backup', [okText]))('x');
    expect(out.ok).toBe(true);
    expect(logs).toContainEqual(expect.objectContaining({ event: 'completed', provider: 'groq', role: 'backup', attempts: 4 }));
  });

  test('default logger writes one JSON line with a fixed prefix', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    original.log('warn', { event: 'x', provider: 'gemini' });
    expect(spy).toHaveBeenCalledWith('[AI Matcher]', '{"event":"x","provider":"gemini"}');
    spy.mockRestore();
  });
});

describe('providers from environment', () => {
  test('defaults and overrides for model names; keys decide "configured"', () => {
    const [g, q] = svc.providersFromEnv({ GEMINI_API_KEY: 'k1', GROQ_API_KEY: '' });
    expect([g.name, g.model, g.configured]).toEqual(['gemini', 'gemini-3.8-flash', true]);
    expect([q.name, q.model, q.configured]).toEqual(['groq', 'openai/gpt-oss-20b', false]);

    const [g2, q2] = svc.providersFromEnv({ GEMINI_API_KEY: 'k', GEMINI_MODEL: ' gemini-x ', GROQ_API_KEY: 'k', GROQ_MODEL: 'groq-y' });
    expect([g2.model, q2.model, q2.configured]).toEqual(['gemini-x', 'groq-y', true]);
  });

  test('whitespace-only keys count as missing', () => {
    const [g, q] = svc.providersFromEnv({ GEMINI_API_KEY: '  ', GROQ_API_KEY: '\t' });
    expect([g.configured, q.configured]).toEqual([false, false]);
  });
});
