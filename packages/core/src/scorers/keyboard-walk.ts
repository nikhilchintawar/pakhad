import type { Scorer, ScorerResult } from '../types.js';

/**
 * Keyboard walk detector.
 *
 * Detects QWERTY/AZERTY adjacency walks like "asdfgh", "qwerty", "zxcvbn".
 * Each consecutive pair of characters is checked for keyboard adjacency.
 * High ratio of adjacent pairs = keyboard walk = gibberish.
 *
 * Score 0 + confidence 0 when no adjacency pattern found (silent scorer).
 */

// QWERTY layout adjacency map — each key maps to its neighbors
const QWERTY_ADJACENT: Record<string, string> = {
  q: 'wa', w: 'qeasd', e: 'wrsd', r: 'etdf', t: 'ryfg',
  y: 'tugh', u: 'yijh', i: 'uojk', o: 'ipkl', p: 'ol',
  a: 'qwsz', s: 'wdezax', d: 'erfcsx', f: 'rtgvcd', g: 'tyhbvf',
  h: 'yujnbg', j: 'uikmnh', k: 'ioljm', l: 'opk',
  z: 'asx', x: 'sdcz', c: 'dfvx', v: 'fgbc', b: 'ghnv',
  n: 'hjmb', m: 'jkn',
  '1': '2q', '2': '13qw', '3': '24we', '4': '35er', '5': '46rt',
  '6': '57ty', '7': '68yu', '8': '79ui', '9': '80io', '0': '9p',
};

// AZERTY layout adjacency map
const AZERTY_ADJACENT: Record<string, string> = {
  a: 'zqs', z: 'aeqs', e: 'zrds', r: 'etfd', t: 'rygf',
  y: 'tuhg', u: 'yijh', i: 'uojk', o: 'ipkl', p: 'ol',
  q: 'awsz', s: 'zeqdwx', d: 'erfcsx', f: 'rtgvcd', g: 'tyhbvf',
  h: 'yujnbg', j: 'uikmnh', k: 'ioljm', l: 'opk',
  w: 'sqx', x: 'sdcw', c: 'dfvx', v: 'fgbc', b: 'ghnv',
  n: 'hjmb', m: 'jkn',
};

function isAdjacent(
  a: string,
  b: string,
  layout: Record<string, string>,
): boolean {
  const neighbors = layout[a];
  return neighbors !== undefined && neighbors.includes(b);
}

function countAdjacentPairs(
  token: string,
  layout: Record<string, string>,
): number {
  let count = 0;
  for (let i = 0; i < token.length - 1; i++) {
    if (isAdjacent(token[i]!, token[i + 1]!, layout)) {
      count++;
    }
  }
  return count;
}

export const keyboardWalkScorer: Scorer = {
  name: 'keyboard_walk',
  minLength: 4,
  defaultWeight: 0.15,

  score(token: string): ScorerResult {
    const lower = token.toLowerCase();
    const pairs = lower.length - 1;

    if (pairs <= 0 || lower.length < 4) {
      return { score: 0, confidence: 0 };
    }

    // Check both layouts, take the one with more matches
    const qwertyCount = countAdjacentPairs(lower, QWERTY_ADJACENT);
    const azertyCount = countAdjacentPairs(lower, AZERTY_ADJACENT);
    const adjacentCount = Math.max(qwertyCount, azertyCount);
    const layout = qwertyCount >= azertyCount ? 'qwerty' : 'azerty';

    const ratio = adjacentCount / pairs;

    // No significant adjacency pattern -> silent
    if (ratio < 0.5) {
      return {
        score: 0,
        confidence: 0,
        details: { adjacentRatio: ratio, layout, adjacentCount },
      };
    }

    // Map ratio 0.5-1.0 -> score 0.3-1.0
    const score = 0.3 + (ratio - 0.5) * 1.4;

    // Confidence scales with token length and ratio
    const confidence = Math.min(1, (lower.length - 3) / 5) * ratio;

    return {
      score: Math.min(1, score),
      confidence,
      details: { adjacentRatio: ratio, layout, adjacentCount },
    };
  },
};
