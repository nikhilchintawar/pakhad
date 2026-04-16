import { describe, it, expect } from 'vitest';
import { numericPatternScorer } from '../../scorers/numeric-pattern.js';
import { makeScorerContext } from '../test-helpers.js';

describe('numeric_pattern scorer', () => {
  const ctx = makeScorerContext();

  it('should flag sequential digits', () => {
    const result = numericPatternScorer.score('123456', ctx);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.details?.type).toBe('sequential');
  });

  it('should flag descending sequences', () => {
    const result = numericPatternScorer.score('987654', ctx);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.details?.type).toBe('sequential');
  });

  it('should flag repeated digits', () => {
    const result = numericPatternScorer.score('99999', ctx);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.details?.type).toBe('repeated');
  });

  it('should recognize year-like patterns as clean', () => {
    for (const year of ['1987', '2024', '1999', '2000']) {
      const result = numericPatternScorer.score(year, ctx);
      expect(result.score).toBe(0);
      expect(result.details?.type).toBe('year_like');
    }
  });

  it('should not score non-numeric tokens', () => {
    const result = numericPatternScorer.score('hello', ctx);
    expect(result.confidence).toBe(0);
  });

  it('should handle mixed alphanumeric as non-match', () => {
    const result = numericPatternScorer.score('abc123', ctx);
    expect(result.confidence).toBe(0);
  });

  it('should give low confidence for ambiguous numbers', () => {
    const result = numericPatternScorer.score('48623', ctx);
    expect(result.confidence).toBeLessThan(0.3);
  });
});
