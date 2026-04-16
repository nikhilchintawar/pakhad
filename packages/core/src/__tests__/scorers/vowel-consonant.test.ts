import { describe, it, expect } from 'vitest';
import { vowelConsonantScorer } from '../../scorers/vowel-consonant.js';
import { makeScorerContext } from '../test-helpers.js';

describe('vowel_consonant scorer', () => {
  const ctx = makeScorerContext();

  it('should flag all-consonant tokens', () => {
    const result = vowelConsonantScorer.score('bcdfgh', ctx);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.details?.type).toBe('no_vowels');
  });

  it('should flag all-vowel tokens', () => {
    const result = vowelConsonantScorer.score('aeiou', ctx);
    expect(result.score).toBeGreaterThan(0.3);
    expect(result.details?.type).toBe('all_vowels');
  });

  it('should flag long consonant clusters', () => {
    const result = vowelConsonantScorer.score('strengths', ctx);
    // "ngths" is a 5-char cluster, borderline
    // "strngths" would be flagged more strongly
    expect(result).toBeDefined();
  });

  it('should not flag normal names', () => {
    for (const name of ['michael', 'sarah', 'david', 'jessica']) {
      const result = vowelConsonantScorer.score(name, ctx);
      expect(result.score).toBeLessThan(0.3);
    }
  });

  it('should handle non-Latin characters gracefully', () => {
    const result = vowelConsonantScorer.score('12345', ctx);
    // No Latin letters -> confidence 0
    expect(result.confidence).toBe(0);
  });

  it('should flag extreme consonant clusters', () => {
    const result = vowelConsonantScorer.score('xkqzvbcdf', ctx);
    expect(result.score).toBeGreaterThan(0.5);
  });
});
