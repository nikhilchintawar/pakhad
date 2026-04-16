import type { Scorer, ScorerResult } from '../types.js';

/**
 * Vowel/consonant ratio and cluster analysis.
 *
 * Flags tokens with:
 * - No vowels at all ("bcdfgh")
 * - All vowels ("aeiou")
 * - Consonant clusters longer than 5 chars (unusual in most Latin-script languages)
 *
 * For non-Latin scripts, this scorer returns confidence 0 (silent).
 */

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

function isLatinLetter(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

export const vowelConsonantScorer: Scorer = {
  name: 'vowel_consonant',
  minLength: 3,
  defaultWeight: 0.1,

  score(token: string): ScorerResult {
    const lower = token.toLowerCase();

    // Only analyze Latin letters
    const letters = [...lower].filter(isLatinLetter);
    if (letters.length < 3) {
      return { score: 0, confidence: 0 };
    }

    const vowelCount = letters.filter((ch) => VOWELS.has(ch)).length;
    const consonantCount = letters.length - vowelCount;
    const vowelRatio = vowelCount / letters.length;

    // Find maximum consonant cluster length
    let maxConsonantCluster = 0;
    let currentCluster = 0;
    for (const ch of letters) {
      if (!VOWELS.has(ch)) {
        currentCluster++;
        maxConsonantCluster = Math.max(maxConsonantCluster, currentCluster);
      } else {
        currentCluster = 0;
      }
    }

    // Find maximum vowel cluster length
    let maxVowelCluster = 0;
    let currentVowelCluster = 0;
    for (const ch of letters) {
      if (VOWELS.has(ch)) {
        currentVowelCluster++;
        maxVowelCluster = Math.max(maxVowelCluster, currentVowelCluster);
      } else {
        currentVowelCluster = 0;
      }
    }

    let score = 0;
    let type = 'normal';

    // All consonants or nearly so (ratio < 0.1)
    if (vowelRatio < 0.1 && letters.length >= 4) {
      score = 0.8 + (0.1 - vowelRatio) * 2;
      type = 'no_vowels';
    }
    // All vowels or nearly so (ratio > 0.9)
    else if (vowelRatio > 0.9 && letters.length >= 4) {
      score = 0.6 + (vowelRatio - 0.9) * 4;
      type = 'all_vowels';
    }
    // Long consonant cluster
    else if (maxConsonantCluster > 5) {
      score = Math.min(1, 0.4 + (maxConsonantCluster - 5) * 0.15);
      type = 'consonant_cluster';
    }
    // Moderately abnormal ratio
    else if (vowelRatio < 0.15 || vowelRatio > 0.8) {
      score = 0.3;
      type = vowelRatio < 0.15 ? 'low_vowel_ratio' : 'high_vowel_ratio';
    }

    if (score === 0) {
      return {
        score: 0,
        confidence: 0,
        details: {
          vowelRatio,
          maxConsonantCluster,
          maxVowelCluster,
          vowelCount,
          consonantCount,
        },
      };
    }

    // Confidence increases with token length
    const confidence = Math.min(1, (letters.length - 2) / 6);

    return {
      score: Math.min(1, Math.max(0, score)),
      confidence,
      details: {
        vowelRatio,
        maxConsonantCluster,
        maxVowelCluster,
        vowelCount,
        consonantCount,
        type,
      },
    };
  },
};
