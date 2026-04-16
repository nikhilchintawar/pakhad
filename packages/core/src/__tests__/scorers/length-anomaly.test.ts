import { describe, it, expect } from 'vitest';
import { lengthAnomalyScorer } from '../../scorers/length-anomaly.js';
import { makeScorerContext } from '../test-helpers.js';

describe('length_anomaly scorer', () => {
  const ctx = makeScorerContext();

  it('should flag single-character tokens', () => {
    const result = lengthAnomalyScorer.score('x', ctx);
    expect(result.score).toBeGreaterThan(0.2);
    expect(result.details?.type).toBe('too_short');
  });

  it('should flag very long tokens (>30 chars)', () => {
    const long = 'a'.repeat(40);
    const result = lengthAnomalyScorer.score(long, ctx);
    expect(result.score).toBeGreaterThan(0.2);
    expect(result.details?.type).toBe('too_long');
  });

  it('should not flag normal-length tokens', () => {
    for (const word of ['hello', 'michael', 'test', 'abcdefghijklmnop']) {
      const result = lengthAnomalyScorer.score(word, ctx);
      expect(result.score).toBe(0);
      expect(result.details?.type).toBe('normal');
    }
  });

  it('should increase score for increasingly long tokens', () => {
    const result35 = lengthAnomalyScorer.score('a'.repeat(35), ctx);
    const result50 = lengthAnomalyScorer.score('a'.repeat(50), ctx);
    expect(result50.score).toBeGreaterThan(result35.score);
  });
});
