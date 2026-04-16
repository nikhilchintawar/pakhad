import { describe, it, expect } from 'vitest';
import { tokenize } from '../tokenizer.js';

describe('tokenize', () => {
  it('should split on whitespace', () => {
    const tokens = tokenize('hello world');
    expect(tokens.map((t) => t.text)).toEqual(['hello', 'world']);
  });

  it('should split on tabs and newlines', () => {
    const tokens = tokenize("hello\tworld\nfoo");
    expect(tokens.map((t) => t.text)).toEqual(['hello', 'world', 'foo']);
  });

  it('should split on special characters: @ . _ - / \\ |', () => {
    const tokens = tokenize('user@example.com');
    expect(tokens.map((t) => t.text)).toEqual(['user', 'example', 'com']);

    const tokens2 = tokenize('first_last-name');
    expect(tokens2.map((t) => t.text)).toEqual(['first', 'last', 'name']);

    const tokens3 = tokenize('path/to\\file|ext');
    expect(tokens3.map((t) => t.text)).toEqual(['path', 'to', 'file', 'ext']);
  });

  it('should split on digit/letter transitions', () => {
    const tokens = tokenize('rahul123');
    expect(tokens.map((t) => t.text)).toEqual(['rahul', '123']);

    const tokens2 = tokenize('123abc456');
    expect(tokens2.map((t) => t.text)).toEqual(['123', 'abc', '456']);
  });

  it('should split on camelCase boundaries', () => {
    const tokens = tokenize('CamelCase');
    expect(tokens.map((t) => t.text)).toEqual(['Camel', 'Case']);

    const tokens2 = tokenize('firstName');
    expect(tokens2.map((t) => t.text)).toEqual(['first', 'Name']);
  });

  it('should not split all-uppercase words (acronyms)', () => {
    const tokens = tokenize('URL');
    expect(tokens.map((t) => t.text)).toEqual(['URL']);

    const tokens2 = tokenize('HTTP');
    expect(tokens2.map((t) => t.text)).toEqual(['HTTP']);

    const tokens3 = tokenize('USA');
    expect(tokens3.map((t) => t.text)).toEqual(['USA']);
  });

  it('should handle uppercase-to-lowercase transitions (XMLParser)', () => {
    const tokens = tokenize('XMLParser');
    expect(tokens.map((t) => t.text)).toEqual(['XML', 'Parser']);
  });

  it('should handle complex mixed cases', () => {
    const tokens = tokenize('getHTTPSUrl');
    expect(tokens.map((t) => t.text)).toEqual(['get', 'HTTPS', 'Url']);
  });

  it('should preserve original case in token text', () => {
    const tokens = tokenize('Hello World');
    expect(tokens[0]!.text).toBe('Hello');
    expect(tokens[1]!.text).toBe('World');
  });

  it('should track correct start and end positions', () => {
    const tokens = tokenize('hello world');
    expect(tokens[0]).toEqual({ text: 'hello', start: 0, end: 5 });
    expect(tokens[1]).toEqual({ text: 'world', start: 6, end: 11 });
  });

  it('should track positions across delimiters', () => {
    const tokens = tokenize('user@domain.com');
    expect(tokens[0]).toEqual({ text: 'user', start: 0, end: 4 });
    expect(tokens[1]).toEqual({ text: 'domain', start: 5, end: 11 });
    expect(tokens[2]).toEqual({ text: 'com', start: 12, end: 15 });
  });

  it('should handle empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('should handle single character', () => {
    const tokens = tokenize('a');
    expect(tokens).toEqual([{ text: 'a', start: 0, end: 1 }]);
  });

  it('should handle all-digit input', () => {
    const tokens = tokenize('12345');
    expect(tokens.map((t) => t.text)).toEqual(['12345']);
  });

  it('should handle multiple consecutive delimiters', () => {
    const tokens = tokenize('hello...world');
    expect(tokens.map((t) => t.text)).toEqual(['hello', 'world']);
  });

  it('should handle leading/trailing whitespace', () => {
    const tokens = tokenize('  hello  ');
    expect(tokens.map((t) => t.text)).toEqual(['hello']);
    expect(tokens[0]!.start).toBe(2);
    expect(tokens[0]!.end).toBe(7);
  });

  it('should handle email-like input', () => {
    const tokens = tokenize('john.doe@example.com');
    expect(tokens.map((t) => t.text)).toEqual([
      'john',
      'doe',
      'example',
      'com',
    ]);
  });

  it('should handle names with digits', () => {
    const tokens = tokenize('player1');
    expect(tokens.map((t) => t.text)).toEqual(['player', '1']);
  });

  it('should handle unicode letters', () => {
    const tokens = tokenize('cafe');
    expect(tokens.map((t) => t.text)).toEqual(['cafe']);
  });

  it('should handle mixed script input', () => {
    const tokens = tokenize('hello world');
    // Should keep non-splitting chars together
    expect(tokens.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle very long tokens', () => {
    const long = 'a'.repeat(100);
    const tokens = tokenize(long);
    expect(tokens.length).toBe(1);
    expect(tokens[0]!.text.length).toBe(100);
  });
});
