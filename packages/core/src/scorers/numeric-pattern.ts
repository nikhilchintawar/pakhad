import type { Scorer, ScorerResult } from '../types.js';

/**
 * Numeric pattern scorer — for all-digit tokens only.
 *
 * Detects:
 * - Sequential digits: "123456" -> high gibberish
 * - Repeated digits: "99999" -> high gibberish
 * - Year-like patterns: "1987", "2024" -> low gibberish, high confidence clean
 * - Otherwise: low confidence (could be phone, zip, ID — unclear)
 */

function isSequential(digits: string): boolean {
  if (digits.length < 3) return false;

  let ascending = true;
  let descending = true;

  for (let i = 1; i < digits.length; i++) {
    const diff = digits.charCodeAt(i) - digits.charCodeAt(i - 1);
    if (diff !== 1) ascending = false;
    if (diff !== -1) descending = false;
  }

  return ascending || descending;
}

function isRepeated(digits: string): boolean {
  if (digits.length < 3) return false;
  return digits.split('').every((ch) => ch === digits[0]);
}

function isYearLike(digits: string): boolean {
  if (digits.length !== 4) return false;
  const num = parseInt(digits, 10);
  return num >= 1900 && num <= 2099;
}

export const numericPatternScorer: Scorer = {
  name: 'numeric_pattern',
  minLength: 3,
  defaultWeight: 0.08,

  score(token: string): ScorerResult {
    // Only score all-digit tokens
    if (!/^\d+$/.test(token)) {
      return { score: 0, confidence: 0 };
    }

    // Year-like: clean signal
    if (isYearLike(token)) {
      return {
        score: 0,
        confidence: 0.8,
        details: { type: 'year_like', value: parseInt(token, 10) },
      };
    }

    // Sequential: gibberish
    if (isSequential(token)) {
      const confidence = Math.min(1, token.length / 6);
      return {
        score: 0.8,
        confidence,
        details: { type: 'sequential' },
      };
    }

    // Repeated: gibberish
    if (isRepeated(token)) {
      const confidence = Math.min(1, token.length / 5);
      return {
        score: 0.85,
        confidence,
        details: { type: 'repeated', digit: token[0] },
      };
    }

    // Otherwise: ambiguous, low confidence
    return {
      score: 0.1,
      confidence: 0.1,
      details: { type: 'other' },
    };
  },
};
