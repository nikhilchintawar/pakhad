import { describe, it, expect } from 'vitest';
import { create } from '../detector.js';
import { makeTestLocale } from './test-helpers.js';

function makeDetector() {
  return create({ locales: [makeTestLocale()] });
}

describe('detect()', () => {
  describe('result shape', () => {
    it('should return all required fields', () => {
      const detector = makeDetector();
      const result = detector.detect('john smith');

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('fieldType');
      expect(result).toHaveProperty('locale');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('durationMs');
      expect(result).toHaveProperty('version');

      expect(result.fieldType).toHaveProperty('provided');
      expect(result.fieldType).toHaveProperty('inferred');
      expect(result.locale).toHaveProperty('mode');
      expect(result.locale).toHaveProperty('script');
      expect(result.locale).toHaveProperty('candidates');
      expect(result.locale).toHaveProperty('matched');
    });

    it('should include per-token breakdown', () => {
      const detector = makeDetector();
      const result = detector.detect('john smith');

      expect(result.tokens.length).toBe(2);
      for (const token of result.tokens) {
        expect(token).toHaveProperty('text');
        expect(token).toHaveProperty('score');
        expect(token).toHaveProperty('label');
        expect(token).toHaveProperty('matchedLocale');
        expect(token).toHaveProperty('scorers');
      }
    });
  });

  describe('real names vs gibberish', () => {
    it('should classify real names as clean', () => {
      const detector = makeDetector();

      for (const name of ['john smith', 'sarah johnson', 'michael david']) {
        const result = detector.detect(name, { fieldType: 'name' });
        expect(result.label).toBe('clean');
        expect(result.score).toBeLessThan(0.3);
      }
    });

    it('should classify obvious gibberish as gibberish', () => {
      const detector = makeDetector();

      for (const gibberish of ['asdfgh jkl', 'xkqzvb wwwxxx']) {
        const result = detector.detect(gibberish, { fieldType: 'name' });
        expect(result.score).toBeGreaterThan(0.3);
        expect(['suspicious', 'gibberish']).toContain(result.label);
      }
    });

    it('should classify keyboard walks as gibberish', () => {
      const detector = makeDetector();
      const result = detector.detect('qwerty asdfgh', { fieldType: 'name' });
      expect(result.score).toBeGreaterThan(0.3);
    });

    it('should classify repetitive input as gibberish', () => {
      const detector = makeDetector();
      const result = detector.detect('aaaa bbbb', { fieldType: 'name' });
      expect(result.score).toBeGreaterThan(0.3);
    });
  });

  describe('field type', () => {
    it('should infer field type when not provided', () => {
      const detector = makeDetector();
      const result = detector.detect('john smith');
      expect(result.fieldType.provided).toBeNull();
      expect(result.fieldType.inferred).toBe('name');
    });

    it('should use provided field type', () => {
      const detector = makeDetector();
      const result = detector.detect('john smith', { fieldType: 'sentence' });
      expect(result.fieldType.provided).toBe('sentence');
      expect(result.fieldType.inferred).toBe('name');
    });

    it('should warn on field type mismatch', () => {
      const detector = makeDetector();
      const result = detector.detect('john smith', { fieldType: 'email' });
      expect(result.warnings).toContain('field_type_mismatch');
    });

    it('should infer email type', () => {
      const detector = makeDetector();
      const result = detector.detect('user@example.com');
      expect(result.fieldType.inferred).toBe('email');
    });

    it('should infer username type', () => {
      const detector = makeDetector();
      const result = detector.detect('cool_user123');
      expect(result.fieldType.inferred).toBe('username');
    });
  });

  describe('locale', () => {
    it('should default to auto locale mode', () => {
      const detector = makeDetector();
      const result = detector.detect('john');
      expect(result.locale.mode).toBe('auto');
    });

    it('should detect Latin script', () => {
      const detector = makeDetector();
      const result = detector.detect('john');
      expect(result.locale.script).toBe('Latin');
    });

    it('should list candidates', () => {
      const detector = makeDetector();
      const result = detector.detect('john');
      expect(result.locale.candidates).toContain('en');
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const detector = makeDetector();
      const result = detector.detect('');
      expect(result.score).toBe(0);
      expect(result.label).toBe('clean');
      expect(result.tokens).toEqual([]);
    });

    it('should handle single character', () => {
      const detector = makeDetector();
      const result = detector.detect('a');
      expect(result.tokens.length).toBe(1);
    });

    it('should handle very long input', () => {
      const detector = makeDetector();
      const result = detector.detect('a'.repeat(100));
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only input', () => {
      const detector = makeDetector();
      const result = detector.detect('   ');
      expect(result.score).toBe(0);
      expect(result.tokens).toEqual([]);
    });

    it('should include timing info', () => {
      const detector = makeDetector();
      const result = detector.detect('john smith');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeLessThan(100);
    });

    it('should include version', () => {
      const detector = makeDetector();
      const result = detector.detect('john');
      expect(result.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('custom thresholds', () => {
    it('should respect custom thresholds', () => {
      const detector = makeDetector();
      const result = detector.detect('xkqzvb', {
        thresholds: { suspicious: 0.1, gibberish: 0.2 },
      });
      // With very low thresholds, even moderate scores get labeled gibberish
      expect(['suspicious', 'gibberish']).toContain(result.label);
    });
  });

  describe('scorer overrides', () => {
    it('should allow disabling specific scorers', () => {
      const detector = makeDetector();
      const normal = detector.detect('asdfgh');
      const withoutKeyboard = detector.detect('asdfgh', {
        scorers: { keyboard_walk: { enabled: false } },
      });
      // Without keyboard walk scorer, the score should be lower
      // (less evidence of gibberish)
      expect(withoutKeyboard.score).toBeLessThanOrEqual(normal.score);
    });
  });

  describe('registerScorer', () => {
    it('should allow registering custom scorers', () => {
      const detector = makeDetector();

      detector.registerScorer({
        name: 'always_clean',
        defaultWeight: 1.0,
        score: () => ({ score: 0, confidence: 1 }),
      });

      // The custom scorer gives a strong clean signal
      const result = detector.detect('xkqzvb');
      // Score should be lower than without the custom scorer
      const baseline = create({ locales: [makeTestLocale()] }).detect('xkqzvb');
      expect(result.score).toBeLessThan(baseline.score);
    });

    it('should replace existing scorer with same name', () => {
      const detector = makeDetector();

      detector.registerScorer({
        name: 'entropy',
        defaultWeight: 0.5,
        score: () => ({ score: 1, confidence: 1 }),
      });

      const result = detector.detect('hello');
      // The replaced entropy scorer always returns 1.0
      const entropyDetail = result.tokens[0]?.scorers.find(
        (s) => s.name === 'entropy',
      );
      expect(entropyDetail?.score).toBe(1);
    });
  });

  describe('false positive prevention', () => {
    it('should not false-positive on names in the name list', () => {
      const detector = makeDetector();

      for (const name of ['john', 'sarah', 'michael', 'jessica', 'william']) {
        const result = detector.detect(name, { fieldType: 'name' });
        expect(result.label).toBe('clean');
      }
    });
  });

  describe('constructor validation', () => {
    it('should throw if no locales provided', () => {
      expect(() => create({ locales: [] })).toThrow('at least one locale');
    });
  });
});
