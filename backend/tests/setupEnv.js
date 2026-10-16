// Runs before every test file. Test-only values; the real .env is never loaded in tests.
process.env.JWT_SECRET = 'test-only-jwt-secret';
process.env.GEMINI_API_KEY = 'test-only-dummy-key';
// Make sure nothing can fall back to a real database connection string.
delete process.env.MONGO_URI;
// Generous auth limits so unrelated tests never trip the limiter; tests/api/rateLimit.test.js builds
// its own app instances with small limits.
process.env.AUTH_LOGIN_MAX = '1000';
process.env.AUTH_SIGNUP_MAX = '1000';
process.env.AUTH_PASSWORD_MAX = '1000';
delete process.env.TRUST_PROXY;
