// Manual Gemini diagnostic. NOT part of the automated tests (jest only runs *.test.js / __tests__).
// Run it yourself from the backend folder:   node scripts/gemini-diagnose.js
//
// It makes at most 4 tiny live requests with synthetic text (no resume or job data, no Groq, no
// retries) and prints: where the API key came from, the key's last 4 characters (the same suffix
// AI Studio shows on its API keys page), and the HTTP status / Google error status / duration of each step.
// The key itself is never printed.
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env');
const keyBeforeDotenv = process.env.GEMINI_API_KEY;
require('dotenv').config({ path: ENV_FILE });

const { DEFAULT_GEMINI_MODEL } = require('../services/aiMatcher');

const apiKey = (process.env.GEMINI_API_KEY || '').trim();
const model = (process.env.GEMINI_MODEL || '').trim() || DEFAULT_GEMINI_MODEL;
const TIMEOUT_MS = 30000;

const redact = (text) => String(text).replace(/AIza[0-9A-Za-z_-]{10,}/g, '[redacted key]').slice(0, 300);

function describeError(err) {
  let body = {};
  try {
    body = JSON.parse(err.message).error || {};
  } catch {
    // not a JSON error body (network failure, abort, ...)
  }
  return {
    httpStatus: err.status ?? '(none)',
    googleStatus: body.status ?? '(none)',
    googleMessage: redact(body.message ?? err.message ?? ''),
    errorName: err.name,
  };
}

async function step(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    console.log(`PASS  ${name}  (${Date.now() - started} ms)`, detail ?? '');
  } catch (err) {
    console.log(`FAIL  ${name}  (${Date.now() - started} ms)`, describeError(err));
  }
}

async function main() {
  console.log('--- configuration ---');
  console.log('env file           :', ENV_FILE);
  console.log('key source         :', keyBeforeDotenv ? 'process environment (set before .env was read; .env does NOT override it)' : apiKey ? 'backend/.env' : 'NOT SET');
  console.log('key ends with      :', apiKey ? `…${apiKey.slice(-4)} (length ${apiKey.length})` : '-');
  console.log('GOOGLE_API_KEY set :', Boolean(process.env.GOOGLE_API_KEY), '(the SDK prefers it only when no key is passed)');
  console.log('Vertex AI switch   :', process.env.GOOGLE_GENAI_USE_VERTEXAI ?? '(unset)');
  console.log('model              :', model, process.env.GEMINI_MODEL ? '(from GEMINI_MODEL)' : '(code default)');
  if (!apiKey) return;

  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const signal = () => AbortSignal.timeout(TIMEOUT_MS);

  console.log('\n--- live checks (one request each, no retries) ---');

  await step('1. model metadata (models.get)', async () => {
    const info = await ai.models.get({ model, config: { abortSignal: signal() } });
    return { name: info.name, inputTokenLimit: info.inputTokenLimit };
  });

  await step('2. SDK generateContent, plain prompt, no config', async () => {
    const res = await ai.models.generateContent({ model, contents: 'Reply with the single word OK.', config: { abortSignal: signal() } });
    return { text: redact(res.text ?? '(no text)') };
  });

  await step('3. SDK generateContent, matcher-style config (systemInstruction + JSON mime type)', async () => {
    const res = await ai.models.generateContent({
      model,
      contents: 'Return {"ok": true}.',
      config: { systemInstruction: 'You return only JSON.', responseMimeType: 'application/json', abortSignal: signal() },
    });
    return { text: redact(res.text ?? '(no text)') };
  });

  await step('4. raw REST call (bypasses the SDK)', async () => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with the single word OK.' }] }] }),
      signal: signal(),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(JSON.stringify(body)), { status: res.status });
    return { httpStatus: res.status, text: redact(body.candidates?.[0]?.content?.parts?.[0]?.text ?? '(no text)') };
  });
}

main();
