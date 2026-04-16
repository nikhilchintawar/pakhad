import type { Token } from './types.js';

const SPLIT_CHARS = new Set(['@', '.', '_', '-', '/', '\\', '|']);
const WHITESPACE = /\s/;

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isLetter(ch: string): boolean {
  // Basic ASCII letters + extended unicode letters
  return /\p{L}/u.test(ch);
}

function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}

function isLower(ch: string): boolean {
  return ch !== ch.toUpperCase() && ch === ch.toLowerCase();
}

/**
 * Tokenize input according to pakhad rules:
 *
 * Split on:
 * - Whitespace (space, tab, newline)
 * - Special characters: @ . _ - / \ |
 * - Digit/letter transitions ("rahul123" -> ["rahul", "123"])
 * - CamelCase boundaries ("CamelCase" -> ["Camel", "Case"])
 *   But only when uppercase is followed by lowercase, to avoid
 *   splitting acronyms like "URL" into "U", "R", "L".
 *
 * Returns tokens with original text (preserving case) and position info.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let currentStart = -1;
  let currentChars: string[] = [];

  function flush(end: number): void {
    if (currentChars.length > 0) {
      tokens.push({
        text: currentChars.join(''),
        start: currentStart,
        end,
      });
      currentChars = [];
      currentStart = -1;
    }
  }

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;

    // Whitespace: flush and skip
    if (WHITESPACE.test(ch)) {
      flush(i);
      continue;
    }

    // Split chars: flush, skip the delimiter
    if (SPLIT_CHARS.has(ch)) {
      flush(i);
      continue;
    }

    // Start new token if needed
    if (currentStart === -1) {
      currentStart = i;
    }

    const prevChar = currentChars.length > 0 ? currentChars[currentChars.length - 1]! : null;

    // Digit/letter transition
    if (prevChar !== null) {
      const prevIsDigit = isDigit(prevChar);
      const currIsDigit = isDigit(ch);
      const prevIsLetter = isLetter(prevChar);
      const currIsLetter = isLetter(ch);

      if ((prevIsDigit && currIsLetter) || (prevIsLetter && currIsDigit)) {
        flush(i);
        currentStart = i;
      }
    }

    // CamelCase split: uppercase char followed by lowercase (checked via lookahead)
    // We split BEFORE the uppercase char if:
    //   1. Previous char was lowercase, current is uppercase (lowerUpper boundary)
    //   2. Previous char was uppercase, current is uppercase, NEXT is lowercase
    //      (handles "XMLParser" -> "XML", "Parser")
    if (prevChar !== null && isLetter(ch) && isLetter(prevChar)) {
      if (isLower(prevChar) && isUpper(ch)) {
        // camelCase boundary: "camelCase" -> "camel", "Case"
        flush(i);
        currentStart = i;
      } else if (isUpper(prevChar) && isUpper(ch)) {
        // Check if next char is lowercase -> split before current
        // "XMLParser" at 'P': prev='L' upper, curr='P' upper, next='a' lower -> split before P
        const nextCh = i + 1 < input.length ? input.charAt(i + 1) : null;
        if (nextCh !== null && isLetter(nextCh) && isLower(nextCh)) {
          flush(i);
          currentStart = i;
        }
      }
    }

    currentChars.push(ch);
  }

  flush(input.length);
  return tokens;
}
