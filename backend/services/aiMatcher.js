// AI resume-match orchestration: Gemini first, Groq as an automatic backup, all inside one HTTP request.
//
// Policy (see DEFAULT_POLICY): bounded attempts per provider, exponential backoff with jitter, a
// per-attempt timeout and an overall deadline that always leaves time for the backup.
// SDK-level retries are switched off (Groq) or left off (Gemini) so this file is the only retry loop.
//
// Logs carry operational metadata only (provider, model, attempt, category, status, delay, duration).
// They never include API keys, prompts, resume or job-description text, model output or upstream
// error messages/bodies: Gemini's ApiError.message is the raw upstream JSON, so it is never logged.

const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';

const DEFAULT_POLICY = {
  deadlineMs: 50000, // whole Analyze request, both providers included
  backupReserveMs: 15000, // primary retries stop early enough to leave this much for the backup
  minAttemptMs: 3000, // don't start an attempt with less time than this
  backoffBaseMs: 1000,
  backoffCapMs: 4000, // also the longest provider Retry-After we are willing to wait
  attempts: { primary: 3, backup: 2 },
  timeoutMs: { primary: 20000, backup: 15000 },
};

// Overridable in tests so retries never wait on real timers.
const deps = {
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random: Math.random,
  now: Date.now,
  log: (level, entry) => console[level]('[AI Matcher]', JSON.stringify(entry)),
};

// Failure categories -> what the orchestrator may do next.
//   retryable: worth another attempt on the same provider
//   failover:  worth trying the independent backup provider
const CATEGORY_RULES = {
  unavailable: { retryable: true, failover: true },
  timeout: { retryable: true, failover: true },
  network: { retryable: true, failover: true },
  rate_limited: { retryable: true, failover: true },
  quota_exhausted: { retryable: false, failover: true },
  configuration: { retryable: false, failover: true },
  invalid_output: { retryable: false, failover: true },
  invalid_request: { retryable: false, failover: false },
};

const failure = (category, extra = {}) => ({ category, ...CATEGORY_RULES[category], ...extra });

// Stable codes for the frontend. Earlier entries win when several providers failed, so a user is told
// "try again shortly" whenever any failure was temporary.
const ERROR_CODE_PRECEDENCE = [
  ['unavailable', 'AI_TEMPORARILY_UNAVAILABLE'],
  ['timeout', 'AI_TEMPORARILY_UNAVAILABLE'],
  ['network', 'AI_TEMPORARILY_UNAVAILABLE'],
  ['rate_limited', 'AI_RATE_LIMITED'],
  ['quota_exhausted', 'AI_QUOTA_EXHAUSTED'],
  ['invalid_output', 'AI_INVALID_OUTPUT'],
  ['invalid_request', 'AI_REQUEST_FAILED'],
];

function errorCodeFor(failures) {
  for (const [category, code] of ERROR_CODE_PRECEDENCE) {
    if (failures.some((f) => f.category === category)) return code;
  }
  if (failures.length > 0 && failures.every((f) => f.category === 'configuration')) return 'AI_CONFIGURATION_ERROR';
  return 'AI_REQUEST_FAILED';
}

// ---------- Error classification (structured fields only, never message text) ----------

// "35s" / "1.5s" (Gemini RetryInfo) or "12" (Retry-After seconds) -> milliseconds.
function durationToMs(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const seconds = parseFloat(String(value).replace(/s$/, ''));
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : undefined;
}

// Gemini's ApiError.message is JSON.stringify(upstream body). Parse it for enum fields only.
function geminiErrorBody(err) {
  try {
    const body = JSON.parse(err.message);
    return body && typeof body.error === 'object' && body.error ? body.error : {};
  } catch {
    return {};
  }
}

const detailsOfType = (body, suffix) =>
  (Array.isArray(body.details) ? body.details : []).filter((d) => typeof d?.['@type'] === 'string' && d['@type'].endsWith(suffix));

function classifyHttp(status, providerStatus) {
  const extra = { httpStatus: status, providerStatus };
  if (status === 401 || status === 403 || status === 404) return failure('configuration', extra);
  if (status === 408 || status === 498 || status >= 500) return failure('unavailable', extra);
  if (status >= 400 && status < 500) return failure('invalid_request', extra);
  return failure('unavailable', extra);
}

function classifyGeminiError(err, { timedOut } = {}) {
  if (timedOut) return failure('timeout');
  const status = err?.status;
  if (!Number.isInteger(status)) return failure('network', { errorName: safeName(err) });

  const body = geminiErrorBody(err);
  const providerStatus = typeof body.status === 'string' ? body.status : undefined;
  const extra = { httpStatus: status, providerStatus };

  if (status === 429) {
    // Only a QuotaFailure naming a per-day quota counts as exhausted; any other 429 is a rate limit.
    const perDay = detailsOfType(body, 'QuotaFailure').some((d) =>
      (Array.isArray(d.violations) ? d.violations : []).some((v) => typeof v?.quotaId === 'string' && /PerDay/i.test(v.quotaId))
    );
    if (perDay) return failure('quota_exhausted', extra);
    const retryAfterMs = durationToMs(detailsOfType(body, 'RetryInfo')[0]?.retryDelay);
    return failure('rate_limited', { ...extra, retryAfterMs });
  }
  if (status === 402) return failure('quota_exhausted', extra); // depleted prepay credits
  if (status === 400) {
    const keyInvalid = detailsOfType(body, 'ErrorInfo').some((d) => d.reason === 'API_KEY_INVALID');
    if (keyInvalid) return failure('configuration', extra);
  }
  return classifyHttp(status, providerStatus);
}

function classifyGroqError(err, { timedOut } = {}) {
  if (timedOut || err?.name === 'APIConnectionTimeoutError') return failure('timeout');
  const status = err?.status;
  if (!Number.isInteger(status)) return failure('network', { errorName: safeName(err) });

  const providerStatus = typeof err?.error?.type === 'string' ? err.error.type : undefined;
  if (status === 429) {
    // Groq does not document a body field that separates exhausted quota from a rate limit,
    // so every 429 is treated as a rate limit.
    const headers = err.headers;
    const retryAfter = typeof headers?.get === 'function' ? headers.get('retry-after') : headers?.['retry-after'];
    return failure('rate_limited', { httpStatus: status, providerStatus, retryAfterMs: durationToMs(retryAfter ?? undefined) });
  }
  return classifyHttp(status, providerStatus);
}

// Error class names are SDK-defined identifiers ("TypeError", "APIConnectionError"), safe to log.
const safeName = (err) => (typeof err?.name === 'string' && /^[A-Za-z]{1,40}$/.test(err.name) ? err.name : 'Error');

// ---------- Providers (clients are created lazily, on first use) ----------

const MATCH_JSON_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer' },
    missingKeywords: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['score', 'missingKeywords', 'suggestions'],
  additionalProperties: false,
};

const clientCache = new Map();
function cachedClient(key, create) {
  if (!clientCache.has(key)) clientCache.set(key, create());
  return clientCache.get(key);
}

function geminiProvider(env) {
  const apiKey = (env.GEMINI_API_KEY || '').trim();
  const model = (env.GEMINI_MODEL || '').trim() || DEFAULT_GEMINI_MODEL;
  return {
    role: 'primary',
    name: 'gemini',
    model,
    configured: Boolean(apiKey),
    classify: classifyGeminiError,
    async generate({ systemInstruction, contents, signal }) {
      const client = cachedClient(`gemini:${apiKey}`, () => {
        const { GoogleGenAI } = require('@google/genai');
        return new GoogleGenAI({ apiKey }); // SDK retries stay off: no httpOptions.retryOptions
      });
      const response = await client.models.generateContent({
        model,
        contents,
        config: { systemInstruction, responseMimeType: 'application/json', abortSignal: signal },
      });
      return response?.text;
    },
  };
}

function groqProvider(env) {
  const apiKey = (env.GROQ_API_KEY || '').trim();
  const model = (env.GROQ_MODEL || '').trim() || DEFAULT_GROQ_MODEL;
  return {
    role: 'backup',
    name: 'groq',
    model,
    configured: Boolean(apiKey),
    classify: classifyGroqError,
    async generate({ systemInstruction, contents, signal, timeoutMs }) {
      const client = cachedClient(`groq:${apiKey}`, () => {
        const Groq = require('groq-sdk');
        return new Groq({ apiKey, maxRetries: 0 }); // the SDK would otherwise retry 429/5xx twice on its own
      });
      const completion = await client.chat.completions.create(
        {
          model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: contents },
          ],
          response_format: { type: 'json_schema', json_schema: { name: 'match_result', strict: true, schema: MATCH_JSON_SCHEMA } },
          reasoning_effort: 'low',
          max_completion_tokens: 4096,
        },
        { signal, timeout: timeoutMs, maxRetries: 0 }
      );
      return completion?.choices?.[0]?.message?.content;
    },
  };
}

const providersFromEnv = (env = process.env) => [geminiProvider(env), groqProvider(env)];

// ---------- Output parsing ----------

// Returns the parsed object, or null for missing text / non-JSON / non-object replies.
function parseModelJson(text) {
  if (typeof text !== 'string') return null;
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    const parsed = JSON.parse(stripped);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ---------- Orchestration ----------

const TIMEOUT = Symbol('timeout');

function createMatcher({ systemInstruction, validate, providers = providersFromEnv, policy: overrides = {} }) {
  const policy = {
    ...DEFAULT_POLICY,
    ...overrides,
    attempts: { ...DEFAULT_POLICY.attempts, ...overrides.attempts },
    timeoutMs: { ...DEFAULT_POLICY.timeoutMs, ...overrides.timeoutMs },
  };

  const backoffMs = (retryNumber) => {
    const exp = Math.min(policy.backoffCapMs, policy.backoffBaseMs * 2 ** (retryNumber - 1));
    return Math.round(exp * (0.5 + deps.random() * 0.5)); // equal jitter: 50-100% of the step
  };

  // One provider call, raced against our own timer so a hung SDK can never outlive the budget.
  async function callOnce(provider, contents, budgetMs) {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve(TIMEOUT);
      }, budgetMs);
    });
    const call = Promise.resolve().then(() =>
      provider.generate({ systemInstruction, contents, signal: controller.signal, timeoutMs: budgetMs })
    );
    call.catch(() => {}); // a late rejection after a timeout must not become an unhandled rejection

    let text;
    try {
      text = await Promise.race([call, timeout]);
    } catch (err) {
      return { ok: false, failure: provider.classify(err, { timedOut: controller.signal.aborted }) };
    } finally {
      clearTimeout(timer);
    }
    if (text === TIMEOUT) return { ok: false, failure: failure('timeout') };

    const parsed = parseModelJson(text);
    if (!parsed) return { ok: false, failure: failure('invalid_output', { reason: 'unparseable' }) };
    if (!validate(parsed)) return { ok: false, failure: failure('invalid_output', { reason: 'schema' }) };
    // Only the contract fields leave the server, never extra model-generated keys.
    const { score, missingKeywords, suggestions } = parsed;
    return { ok: true, result: { score, missingKeywords, suggestions } };
  }

  async function runProvider(provider, ctx, reserveMs) {
    const maxAttempts = policy.attempts[provider.role] ?? 1;
    const perAttemptMs = policy.timeoutMs[provider.role] ?? policy.timeoutMs.backup;
    let last;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const budgetMs = Math.min(perAttemptMs, ctx.deadline - deps.now() - reserveMs);
      if (budgetMs < policy.minAttemptMs) {
        last = last || failure('timeout', { reason: 'deadline' });
        break;
      }

      ctx.attempts += 1;
      const outcome = await callOnce(provider, ctx.contents, budgetMs);
      if (outcome.ok) return outcome;
      last = outcome.failure;

      let retryInMs = null;
      if (last.retryable && attempt < maxAttempts) {
        const delay = last.retryAfterMs !== undefined ? last.retryAfterMs : backoffMs(attempt);
        const fitsBudget = deps.now() + delay + policy.minAttemptMs <= ctx.deadline - reserveMs;
        if (delay <= policy.backoffCapMs && fitsBudget) retryInMs = delay;
      }

      deps.log('warn', {
        event: 'attempt_failed',
        provider: provider.name,
        model: provider.model,
        attempt,
        category: last.category,
        httpStatus: last.httpStatus,
        providerStatus: last.providerStatus,
        reason: last.reason,
        errorName: last.errorName,
        retryInMs,
      });

      if (retryInMs === null) break;
      await deps.sleep(retryInMs);
    }
    return { ok: false, failure: last };
  }

  return async function analyze(contents) {
    const started = deps.now();
    const ctx = { contents, attempts: 0, deadline: started + policy.deadlineMs };
    const chain = providers();
    const failures = [];

    for (let i = 0; i < chain.length; i += 1) {
      const provider = chain[i];
      if (i > 0) {
        const previous = failures[failures.length - 1];
        if (!previous.failover) break;
        deps.log('warn', { event: 'fallback', from: chain[i - 1].name, to: provider.name, reason: previous.category });
      }

      if (!provider.configured) {
        deps.log('warn', { event: 'provider_skipped', provider: provider.name, category: 'configuration', reason: 'missing_api_key' });
        failures.push(failure('configuration', { reason: 'missing_api_key' }));
        continue;
      }

      const hasLaterProvider = chain.slice(i + 1).some((p) => p.configured);
      const outcome = await runProvider(provider, ctx, hasLaterProvider ? policy.backupReserveMs : 0);
      if (outcome.ok) {
        deps.log('info', {
          event: 'completed',
          provider: provider.name,
          model: provider.model,
          role: provider.role,
          attempts: ctx.attempts,
          durationMs: deps.now() - started,
        });
        return { ok: true, result: outcome.result, provider: provider.role, attempts: ctx.attempts };
      }
      failures.push(outcome.failure);
    }

    const code = errorCodeFor(failures);
    deps.log('error', {
      event: 'failed',
      code,
      categories: failures.map((f) => f.category),
      attempts: ctx.attempts,
      durationMs: deps.now() - started,
    });
    return { ok: false, code, attempts: ctx.attempts };
  };
}

module.exports = {
  createMatcher,
  providersFromEnv,
  classifyGeminiError,
  classifyGroqError,
  parseModelJson,
  errorCodeFor,
  deps,
  DEFAULT_POLICY,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  MATCH_JSON_SCHEMA,
};
