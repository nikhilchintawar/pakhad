import { describe, it, expect } from 'vitest';
import { repetitionScorer } from '../../scorers/repetition.js';
import { makeScorerContext } from '../test-helpers.js';

describe('repetition scorer', () => {
  const ctx = makeScorerContext();

  it('should flag run-length repetition', () => {
    const result = repetitionScorer.score('aaaa', ctx);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.details?.type).toBe('run_length');
  });

  it('should flag pattern repetition', () => {
    const result = repetitionScorer.score('abcabcabc', ctx);
    expect(result.score).toBeGreaterThan(0.3);
    expect(result.details?.type).toBe('pattern');
  });

  it('should flag xyzxyz', () => {
    const result = repetitionScorer.score('xyzxyz', ctx);
    expect(result.score).toBeGreaterThan(0.3);
  });

  it('should not flag normal words', () => {
    for (const word of ['hello', 'world', 'sarah', 'james']) {
      const result = repetitionScorer.score(word, ctx);
      expect(result.score).toBeLessThan(0.3);
    }
  });

  it('should flag long runs of same character', () => {
    const result = repetitionScorer.score('zzzzzzzz', ctx);
    expect(result.score).toBeGreaterThan(0.7);
  });

  it('should handle words with some repetition (like "mississippi")', () => {
    const result = repetitionScorer.score('mississippi', ctx);
    // Has repetition but not pure pattern — should be moderate
    expect(result.score).toBeLessThan(0.6);
  });
});
