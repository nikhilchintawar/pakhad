import type { Scorer, ScorerContext, ScorerResult } from '../types.js';

/**
 * Markov n-gram transition probability scorer.
 *
 * Scores tokens by their average n-gram transition probability against
 * the locale's trained Markov model. Tokens with low-probability transitions
 * (uncommon character sequences) score higher as gibberish.
 *
 * Min length is the model's order (typically 3 for trigram models).
 * Confidence scales with token length — more characters = more n-grams = more confident.
 */
export const markovScorer: Scorer = {
  name: 'markov',
  minLength: 3,
  defaultWeight: 0.25,

  score(token: string, ctx: ScorerContext): ScorerResult {
    const model = ctx.locale.markov;
    const lower = token.toLowerCase();

    // Skip tokens shorter than the model's n-gram order
    if (lower.length < model.order) {
      return { score: 0, confidence: 0 };
    }

    const { score, avgLogProb } = model.scoreToken(lower);

    // Confidence scales with token length: more n-grams = more reliable
    // At order=3, a 3-char token gives 1 n-gram (low confidence),
    // an 8-char token gives 6 n-grams (high confidence)
    const ngramCount = lower.length - model.order + 1;
    const confidence = Math.min(1, ngramCount / 6);

    return {
      score,
      confidence,
      details: {
        avgLogProb,
        ngramCount,
        modelOrder: model.order,
      },
    };
  },
};
