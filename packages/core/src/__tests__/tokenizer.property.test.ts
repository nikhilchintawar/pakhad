import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { tokenize } from '../tokenizer.js';

describe('tokenizer (property-based)', () => {
  it('every token text should be a substring of the original input', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
        const tokens = tokenize(input);
        for (const token of tokens) {
          expect(input.includes(token.text)).toBe(true);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('token positions should be non-overlapping and ordered', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
        const tokens = tokenize(input);
        for (let i = 1; i < tokens.length; i++) {
          const prev = tokens[i - 1]!;
          const curr = tokens[i]!;
          // Each token starts at or after the previous one ends
          expect(curr.start).toBeGreaterThanOrEqual(prev.end);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('start + text.length should equal end for every token', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
        const tokens = tokenize(input);
        for (const token of tokens) {
          expect(token.start + token.text.length).toBe(token.end);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('tokens should never be empty strings', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
        const tokens = tokenize(input);
        for (const token of tokens) {
          expect(token.text.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('start should be >= 0 and end should be <= input.length', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
        const tokens = tokenize(input);
        for (const token of tokens) {
          expect(token.start).toBeGreaterThanOrEqual(0);
          expect(token.end).toBeLessThanOrEqual(input.length);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('input.substring(start, end) should equal token.text', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
        const tokens = tokenize(input);
        for (const token of tokens) {
          expect(input.substring(token.start, token.end)).toBe(token.text);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('empty input should produce no tokens', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('all-whitespace input should produce no tokens', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 50 }).map(arr => arr.join('')),
        (input) => {
          expect(tokenize(input)).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all-delimiter input should produce no tokens', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('@', '.', '_', '-', '/', '\\', '|'), {
          minLength: 1,
          maxLength: 50,
        }).map(arr => arr.join('')),
        (input) => {
          expect(tokenize(input)).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('concatenating all token texts with delimiters should be a lossy round-trip', () => {
    // The tokenizer discards delimiters, so we can't round-trip perfectly.
    // But concatenating tokens should produce a string that's a subset of
    // the non-delimiter characters from the input.
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (input) => {
          const tokens = tokenize(input);
          const concatenated = tokens.map((t) => t.text).join('');
          // Every character in concatenated should appear in input
          for (const ch of concatenated) {
            expect(input.includes(ch)).toBe(true);
          }
        },
      ),
      { numRuns: 300 },
    );
  });
});
