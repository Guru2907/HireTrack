// Runs before every test file. Test-only values; the real .env is never loaded in tests.
process.env.JWT_SECRET = 'test-only-jwt-secret';
process.env.GEMINI_API_KEY = 'test-only-dummy-key';
// Make sure nothing can fall back to a real database connection string.
delete process.env.MONGO_URI;
