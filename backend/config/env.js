// Environment checks. Messages name variables but never print their values.

const REQUIRED = ['MONGO_URI', 'JWT_SECRET', 'PORT'];
const RECOMMENDED = {
  GEMINI_API_KEY: 'the resume matcher will fail until it is set',
  CLIENT_URL: 'CORS falls back to http://localhost:5173',
};
const MAX_PROXY_HOPS = 10;

// TRUST_PROXY = how many reverse proxies sit in front of this app (e.g. 1).
// Unset / "false" / "0" means "trust none": req.ip is the socket address and X-Forwarded-For is ignored.
// A bare "true" is rejected on purpose: it trusts the left-most (client-controlled) X-Forwarded-For entry,
// which lets anyone spoof their IP and dodge the rate limiter.
function getTrustProxy(env = process.env) {
  const raw = (env.TRUST_PROXY || '').trim().toLowerCase();
  if (raw === '' || raw === 'false' || raw === '0') return false;
  if (/^\d+$/.test(raw)) {
    const hops = Number(raw);
    if (hops <= MAX_PROXY_HOPS) return hops;
  }
  throw new Error(`TRUST_PROXY must be "false" or a number of proxy hops between 1 and ${MAX_PROXY_HOPS}`);
}

function positiveIntOrUndefined(env, name) {
  if (env[name] === undefined || env[name] === '') return null;
  return /^\d+$/.test(env[name]) && Number(env[name]) > 0 ? null : `${name} must be a positive whole number`;
}

function validateEnv(env = process.env) {
  const errors = [];
  const warnings = [];

  for (const name of REQUIRED) {
    if (!env[name] || !String(env[name]).trim()) errors.push(`${name} is required but not set`);
  }
  if (env.PORT && !/^\d+$/.test(env.PORT)) errors.push('PORT must be a number');

  if (env.JWT_SECRET && env.JWT_SECRET.length < 16) {
    warnings.push('JWT_SECRET is shorter than 16 characters; use a long random string');
  }
  for (const [name, consequence] of Object.entries(RECOMMENDED)) {
    if (!env[name] || !String(env[name]).trim()) warnings.push(`${name} is not set: ${consequence}`);
  }

  try {
    getTrustProxy(env);
  } catch (err) {
    errors.push(err.message);
  }
  for (const name of ['AUTH_LOGIN_MAX', 'AUTH_SIGNUP_MAX']) {
    const problem = positiveIntOrUndefined(env, name);
    if (problem) errors.push(problem);
  }

  return { errors, warnings };
}

module.exports = { validateEnv, getTrustProxy };
