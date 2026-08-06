const { isValidMatchResult } = require('../match');

describe('isValidMatchResult', () => {
  test('accepts a well-formed match result', () => {
    expect(isValidMatchResult({ score: 85, missingKeywords: ['Docker'], suggestions: ['a', 'b', 'c'] })).toBe(true);
  });

  test('rejects a score outside the 0-100 range', () => {
    expect(isValidMatchResult({ score: 150, missingKeywords: [], suggestions: [] })).toBe(false);
  });

  test('rejects a score that is not a number', () => {
    expect(isValidMatchResult({ score: "85", missingKeywords: [], suggestions: [] })).toBe(false);
  });

  test('rejects missingKeywords that is not an array', () => {
    expect(isValidMatchResult({ score: 50, missingKeywords: "none", suggestions: [] })).toBe(false);
  });

  test('rejects a response with a missing field', () => {
    expect(isValidMatchResult({ score: 50, missingKeywords: [] })).toBe(false);
  });
});