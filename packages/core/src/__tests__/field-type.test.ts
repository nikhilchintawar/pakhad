import { describe, it, expect } from 'vitest';
import { inferFieldType } from '../field-type.js';
import { tokenize } from '../tokenizer.js';

function infer(input: string) {
  return inferFieldType(input, tokenize(input));
}

describe('inferFieldType', () => {
  describe('email', () => {
    it('should detect standard email', () => {
      expect(infer('user@example.com')).toBe('email');
    });

    it('should detect email with subdomains', () => {
      expect(infer('user@mail.example.co.uk')).toBe('email');
    });

    it('should not detect @ without dot after it', () => {
      expect(infer('user@localhost')).not.toBe('email');
    });
  });

  describe('username', () => {
    it('should detect username with digits', () => {
      expect(infer('player1')).toBe('username');
    });

    it('should detect username with underscores', () => {
      expect(infer('john_doe')).toBe('username');
    });

    it('should detect username with mixed', () => {
      expect(infer('user_123')).toBe('username');
    });

    it('should detect username with hyphens and digits', () => {
      expect(infer('cool-guy99')).toBe('username');
    });

    it('should not detect pure alpha as username', () => {
      expect(infer('johndoe')).not.toBe('username');
    });

    it('should not detect too-short strings as username', () => {
      expect(infer('a1')).not.toBe('username');
    });

    it('should not detect too-long strings as username', () => {
      const long = 'a'.repeat(25) + '_' + '1'.repeat(5);
      expect(infer(long)).not.toBe('username');
    });
  });

  describe('name', () => {
    it('should detect single name', () => {
      expect(infer('Rahul')).toBe('name');
    });

    it('should detect first and last name', () => {
      expect(infer('John Doe')).toBe('name');
    });

    it('should detect three-part name', () => {
      expect(infer('Mary Jane Watson')).toBe('name');
    });

    it('should detect four-part name', () => {
      expect(infer('Jose Maria Luis Garcia')).toBe('name');
    });

    it('should not detect single-char tokens as name', () => {
      expect(infer('A B')).not.toBe('name');
    });

    it('should not detect 5+ token sequence as name', () => {
      expect(infer('one two three four five')).not.toBe('name');
    });
  });

  describe('sentence', () => {
    it('should detect long token sequences as sentence', () => {
      expect(infer('the quick brown fox jumps')).toBe('sentence');
    });

    it('should detect input with stopwords as sentence', () => {
      expect(infer('this is good')).toBe('sentence');
    });

    it('should detect input with articles', () => {
      expect(infer('the big house')).toBe('sentence');
    });
  });

  describe('address', () => {
    it('should detect street address', () => {
      expect(infer('123 Main Street')).toBe('address');
    });

    it('should detect abbreviated address', () => {
      expect(infer('456 Oak Ave')).toBe('address');
    });

    it('should detect address with apartment', () => {
      expect(infer('789 Elm Rd Apt 4')).toBe('address');
    });

    it('should not detect numbers without address keywords', () => {
      expect(infer('123 hello')).not.toBe('address');
    });
  });

  describe('freetext', () => {
    it('should fallback to freetext for ambiguous input', () => {
      expect(infer('abc123!@#')).toBe('freetext');
    });

    it('should fallback for single special chars', () => {
      expect(infer('!')).toBe('freetext');
    });

    it('should fallback for mixed short tokens', () => {
      expect(infer('x 1')).toBe('freetext');
    });
  });
});
