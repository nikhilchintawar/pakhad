import { describe, it, expect } from 'vitest';
import { markovScorer } from '../../scorers/markov.js';
import { makeScorerContext } from '../test-helpers.js';

describe('markov scorer', () => {
  const ctx = makeScorerContext();

  it('should score known names lower than gibberish', () => {
    const real = markovScorer.score('john', ctx);
    const gibberish = markovScorer.score('xkqzvb', ctx);
    expect(real.score).toBeLessThan(gibberish.score);
  });

  it('should score training corpus names as low gibberish', () => {
    for (const name of ['james', 'michael', 'sarah', 'jessica']) {
      const result = markovScorer.score(name, ctx);
      expect(result.score).toBeLessThan(0.5);
    }
  });

  it('should score random characters as high gibberish', () => {
    for (const gibberish of ['xkqzvb', 'wwwxxx', 'zqjkpl']) {
      const result = markovScorer.score(gibberish, ctx);
      expect(result.score).toBeGreaterThan(0.3);
    }
  });

  it('should return zero confidence for very short tokens', () => {
    const result = markovScorer.score('ab', ctx);
    expect(result.confidence).toBe(0);
  });

  it('should have higher confidence for longer tokens', () => {
    const short = markovScorer.score('john', ctx);
    const long = markovScorer.score('christopher', ctx);
    expect(long.confidence).toBeGreaterThan(short.confidence);
  });

  it('should include diagnostic details', () => {
    const result = markovScorer.score('test', ctx);
    expect(result.details).toHaveProperty('avgLogProb');
    expect(result.details).toHaveProperty('ngramCount');
    expect(result.details).toHaveProperty('modelOrder');
  });
});
