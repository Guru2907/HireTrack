// Run with: node --test tests/matchErrors.test.mjs   (Node's built-in runner; no extra dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeMatchError, usedBackupProvider } from "../src/lib/matchErrors.js";

const serverError = (status, data) => ({ response: { status, data } });

test("maps every stable server errorCode to a message and retry flag", () => {
  const expected = {
    AI_TEMPORARILY_UNAVAILABLE: true,
    AI_RATE_LIMITED: true,
    AI_QUOTA_EXHAUSTED: false,
    AI_CONFIGURATION_ERROR: false,
    AI_INVALID_OUTPUT: true,
    AI_REQUEST_FAILED: true,
  };
  for (const [code, retryable] of Object.entries(expected)) {
    const out = describeMatchError(serverError(503, { message: "server text", errorCode: code }));
    assert.equal(out.retryable, retryable, code);
    assert.ok(out.message.length > 10, code);
    assert.notEqual(out.message, "server text", code);
  }
});

test("temporary unavailability says inputs are preserved", () => {
  const out = describeMatchError(serverError(503, { errorCode: "AI_TEMPORARILY_UNAVAILABLE" }));
  assert.match(out.message, /inputs are preserved/);
});

test("quota and configuration errors do not promise that retrying will help", () => {
  for (const code of ["AI_QUOTA_EXHAUSTED", "AI_CONFIGURATION_ERROR"]) {
    const out = describeMatchError(serverError(503, { errorCode: code }));
    assert.equal(out.retryable, false);
    assert.match(out.message, /later/);
  }
});

test("the per-user limit and validation errors show the server message without Retry", () => {
  assert.deepEqual(describeMatchError(serverError(429, { message: "Too many match requests. Please wait a few minutes and try again." })), {
    message: "Too many match requests. Please wait a few minutes and try again.",
    retryable: false,
  });
  assert.deepEqual(describeMatchError(serverError(400, { message: "Job description is required" })), {
    message: "Job description is required",
    retryable: false,
  });
});

test("an unknown errorCode falls back to the server message", () => {
  const out = describeMatchError(serverError(503, { message: "Service down", errorCode: "SOMETHING_NEW" }));
  assert.deepEqual(out, { message: "Service down", retryable: false });
});

test("no response: network failure and client timeout are both retryable", () => {
  assert.equal(describeMatchError({ message: "Network Error" }).retryable, true);
  assert.match(describeMatchError({ message: "Network Error" }).message, /reach HireTrack/);
  const timeout = describeMatchError({ code: "ECONNABORTED" });
  assert.equal(timeout.retryable, true);
  assert.match(timeout.message, /too long/);
});

test("missing body or null error never throws", () => {
  assert.deepEqual(describeMatchError(serverError(500, undefined)), { message: "Something went wrong", retryable: false });
  assert.equal(describeMatchError(null).retryable, true);
});

test("backup note only when the server confirms the backup produced the result", () => {
  assert.equal(usedBackupProvider({ score: 1, provider: "backup" }), true);
  assert.equal(usedBackupProvider({ score: 1, provider: "primary" }), false);
  assert.equal(usedBackupProvider({ score: 1 }), false);
  assert.equal(usedBackupProvider(null), false);
});
