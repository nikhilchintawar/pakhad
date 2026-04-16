import type { Scorer, ScorerContext, ScorerResult } from '../types.js';

/**
 * Shannon entropy scorer.
 *
 * Measures the information entropy of the character distribution in a token.
 * - Very low entropy = repetitive ("aaaa") -> suspicious
 * - Very high entropy = random characters ("xkqzvb") -> suspicious
 * - Normal entropy = typical text
 *
 * Score is distance from the expected entropy range for the locale,
 * normalized to 0-1.
 */
export const entropyScorer: Scorer = {
  name: 'entropy',
  minLength: 3,
  defaultWeight: 0.12,

  score(token: string, ctx: ScorerContext): ScorerResult {
    const lower = token.toLowerCase();

    // Count character frequencies
    const freq = new Map<string, number>();
    for (const ch of lower) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }

    // Calculate Shannon entropy
    const len = lower.length;
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    // Maximum possible entropy for this length
    const maxEntropy = Math.log2(Math.min(len, 26));

    // Normalized entropy (0-1 range)
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    // Expected entropy range depends on locale and token length
    // Typical text falls in 0.4 - 0.85 range of normalized entropy
    const { min: expectedMin, max: expectedMax } = getExpectedRange(ctx);

    let score: number;
    let detail: string;

    if (normalizedEntropy < expectedMin) {
      // Too repetitive
      score = (expectedMin - normalizedEntropy) / expectedMin;
      detail = 'low_entropy';
    } else if (normalizedEntropy > expectedMax) {
      // High entropy is a weak signal: many real names have all-unique
      // characters. Cap the score low; the Markov model handles randomness.
      score = 0.2;
      detail = 'high_entropy';
    } else {
      // Normal range
      score = 0;
      detail = 'normal';
    }

    // Scale by token length — longer tokens give more reliable entropy estimates
    const confidence = Math.min(1, (len - 2) / 8);

    return {
      score: Math.min(1, Math.max(0, score)),
      confidence,
      details: {
        entropy,
        maxEntropy,
        normalizedEntropy,
        detail,
      },
    };
  },
};

function getExpectedRange(_ctx: ScorerContext): {
  min: number;
  max: number;
} {
  // Default expected range for Latin-script text.
  // Names often have all-unique characters (high entropy), so the upper
  // bound needs to be generous. True randomness only flags at extremes
  // combined with other scorers.
  // Upper bound is very high because many real words have all-unique
  // characters (normalized entropy = 1.0). Entropy alone cannot distinguish
  // "michael" from "xkqzvb" — the Markov model handles that.
  // This scorer only flags extreme repetition (low) or truly pathological
  // distributions at the high end.
  return { min: 0.3, max: 0.98 };
}
