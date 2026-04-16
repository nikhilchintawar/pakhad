import type { Scorer, ScorerResult } from '../types.js';

/**
 * Length anomaly scorer.
 *
 * Flags tokens that are extremely short (1 char) or extremely long (>30 chars)
 * with moderate confidence. These lengths are unusual for most field types.
 */
export const lengthAnomalyScorer: Scorer = {
  name: 'length_anomaly',
  // No minLength — this scorer's purpose is to flag short tokens
  defaultWeight: 0.05,

  score(token: string): ScorerResult {
    const len = token.length;

    // Single character: moderately suspicious
    if (len === 1) {
      return {
        score: 0.4,
        confidence: 0.3,
        details: { length: len, type: 'too_short' },
      };
    }

    // Very long token (> 30 chars): moderately suspicious
    if (len > 30) {
      // Score increases with length beyond 30
      const excess = len - 30;
      const score = Math.min(1, 0.3 + excess * 0.02);
      return {
        score,
        confidence: 0.4,
        details: { length: len, type: 'too_long', excess },
      };
    }

    // Normal length: no signal
    return {
      score: 0,
      confidence: 0,
      details: { length: len, type: 'normal' },
    };
  },
};
