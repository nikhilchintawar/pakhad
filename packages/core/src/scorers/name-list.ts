import type { Scorer, ScorerContext, ScorerResult } from '../types.js';

/**
 * Name list scorer — bloom filter lookup against locale name corpus.
 *
 * - Hit: score 0.0, confidence 1.0 (strong clean signal — this IS a known name)
 * - Miss: score 0, confidence 0 (silent — absence of a name isn't evidence of gibberish)
 *
 * This is the key scorer that prevents false positives on real names like "Saanvi",
 * "Nikhil", "Siobhan", etc. that other scorers might flag due to unusual
 * character patterns.
 */
export const nameListScorer: Scorer = {
  name: 'name_list',
  minLength: 2,
  defaultWeight: 0.35,

  score(token: string, ctx: ScorerContext): ScorerResult {
    const lower = token.toLowerCase();

    const found = ctx.locale.nameList.has(lower);

    if (found) {
      return {
        score: 0.0,
        confidence: 1.0,
        details: { found: true, locale: ctx.locale.id },
      };
    }

    // Not found -> silent (not evidence of gibberish)
    return {
      score: 0,
      confidence: 0,
      details: { found: false, locale: ctx.locale.id },
    };
  },
};
