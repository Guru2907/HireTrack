const { validateEnv, getTrustProxy } = require('../../config/env');

const goodEnv = { MONGO_URI: 'mongodb://example/db', JWT_SECRET: 'a-long-enough-secret-value', PORT: '5000', GEMINI_API_KEY: 'k', CLIENT_URL: 'http://x' };

describe('validateEnv', () => {
  test('accepts a complete configuration with no errors or warnings', () => {
    expect(validateEnv(goodEnv)).toEqual({ errors: [], warnings: [] });
  });

  test('reports each missing required variable by name', () => {
    const { errors } = validateEnv({});
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('MONGO_URI'),
      expect.stringContaining('JWT_SECRET'),
      expect.stringContaining('PORT'),
    ]));
  });

  test('treats blank values as missing', () => {
    expect(validateEnv({ ...goodEnv, JWT_SECRET: '   ' }).errors[0]).toMatch(/JWT_SECRET/);
  });

  test('never prints variable values in errors or warnings', () => {
    const secret = 'super-secret-value-123';
    const { errors, warnings } = validateEnv({ MONGO_URI: 'mongodb://user:hunter2@host/db', JWT_SECRET: 'short', PORT: 'not-a-number', TRUST_PROXY: secret });
    const text = JSON.stringify([errors, warnings]);

    expect(text).not.toMatch(/hunter2|mongodb:\/\/|super-secret/);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('warns (does not fail) for a missing GEMINI_API_KEY / CLIENT_URL and a short JWT secret', () => {
    const { errors, warnings } = validateEnv({ MONGO_URI: 'x', JWT_SECRET: 'short', PORT: '5000' });

    expect(errors).toEqual([]);
    expect(warnings.join(' ')).toMatch(/GEMINI_API_KEY/);
    expect(warnings.join(' ')).toMatch(/CLIENT_URL/);
    expect(warnings.join(' ')).toMatch(/JWT_SECRET/);
  });

  test('rejects an invalid PORT and invalid limiter overrides', () => {
    expect(validateEnv({ ...goodEnv, PORT: 'abc' }).errors).toEqual(expect.arrayContaining([expect.stringMatching(/PORT/)]));
    expect(validateEnv({ ...goodEnv, AUTH_LOGIN_MAX: '0' }).errors.join()).toMatch(/AUTH_LOGIN_MAX/);
    expect(validateEnv({ ...goodEnv, AUTH_SIGNUP_MAX: 'lots' }).errors.join()).toMatch(/AUTH_SIGNUP_MAX/);
  });
});

describe('getTrustProxy', () => {
  test.each([[undefined], [''], ['false'], ['FALSE'], ['0']])('%j means trust no proxy', (value) => {
    expect(getTrustProxy({ TRUST_PROXY: value })).toBe(false);
  });

  test.each([['1', 1], ['2', 2], [' 3 ', 3]])('%j means %i proxy hop(s)', (value, hops) => {
    expect(getTrustProxy({ TRUST_PROXY: value })).toBe(hops);
  });

  test.each([['true'], ['yes'], ['loopback'], ['-1'], ['1.5'], ['11'], ['99999']])(
    '%j is rejected (true would trust spoofable headers)',
    (value) => {
      expect(() => getTrustProxy({ TRUST_PROXY: value })).toThrow(/TRUST_PROXY/);
    },
  );

  test('validateEnv reports an unsafe TRUST_PROXY as an error', () => {
    expect(validateEnv({ ...goodEnv, TRUST_PROXY: 'true' }).errors.join()).toMatch(/TRUST_PROXY/);
  });
});
