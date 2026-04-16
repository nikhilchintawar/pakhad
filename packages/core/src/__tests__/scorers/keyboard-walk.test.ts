import { describe, it, expect } from 'vitest';
import { keyboardWalkScorer } from '../../scorers/keyboard-walk.js';
import { makeScorerContext } from '../test-helpers.js';

describe('keyboard_walk scorer', () => {
  const ctx = makeScorerContext();

  it('should flag QWERTY row walks', () => {
    const result = keyboardWalkScorer.score('asdfgh', ctx);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('should flag qwerty sequence', () => {
    const result = keyboardWalkScorer.score('qwerty', ctx);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('should flag zxcvbn', () => {
    const result = keyboardWalkScorer.score('zxcvbn', ctx);
    expect(result.score).toBeGreaterThan(0.3);
  });

  it('should not flag normal words', () => {
    for (const word of ['hello', 'world', 'michael', 'sarah']) {
      const result = keyboardWalkScorer.score(word, ctx);
      // Should be silent (confidence 0) or low score
      expect(result.score).toBeLessThan(0.5);
    }
  });

  it('should not flag short tokens', () => {
    const result = keyboardWalkScorer.score('as', ctx);
    // Too short, should be silent
    expect(result.confidence).toBe(0);
  });

  it('should detect AZERTY walks', () => {
    const result = keyboardWalkScorer.score('azerty', ctx);
    expect(result.score).toBeGreaterThan(0.3);
  });

  it('should be case-insensitive', () => {
    const lower = keyboardWalkScorer.score('asdfgh', ctx);
    const upper = keyboardWalkScorer.score('ASDFGH', ctx);
    expect(lower.score).toBeCloseTo(upper.score, 5);
  });
});
