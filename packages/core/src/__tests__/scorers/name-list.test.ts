import { describe, it, expect } from 'vitest';
import { nameListScorer } from '../../scorers/name-list.js';
import { makeScorerContext } from '../test-helpers.js';

describe('name_list scorer', () => {
  const ctx = makeScorerContext();

  it('should score known names as clean with high confidence', () => {
    for (const name of ['john', 'sarah', 'michael', 'jessica']) {
      const result = nameListScorer.score(name, ctx);
      expect(result.score).toBe(0);
      expect(result.confidence).toBe(1);
      expect(result.details?.found).toBe(true);
    }
  });

  it('should be silent (confidence 0) for unknown tokens', () => {
    for (const unknown of ['xkqzvb', 'asdfgh', 'zzzzz']) {
      const result = nameListScorer.score(unknown, ctx);
      expect(result.confidence).toBe(0);
      expect(result.details?.found).toBe(false);
    }
  });

  it('should be case-insensitive', () => {
    const result = nameListScorer.score('JOHN', ctx);
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(1);
  });

  it('should include locale info in details', () => {
    const result = nameListScorer.score('john', ctx);
    expect(result.details?.locale).toBe('en');
  });

  it('should not flag absence as evidence of gibberish', () => {
    // Unknown name should have score 0 (not penalized), confidence 0 (silent)
    const result = nameListScorer.score('unicorn', ctx);
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
  });
});
