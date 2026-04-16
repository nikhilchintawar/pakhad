import type { FieldType, Token } from './types.js';

// Common English stopwords for sentence detection
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'must', 'of', 'in', 'to',
  'for', 'with', 'on', 'at', 'from', 'by', 'as', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'and', 'but',
  'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each',
  'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
  'if', 'when', 'where', 'how', 'what', 'which', 'who', 'whom', 'this',
  'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'he', 'she', 'it', 'they', 'them', 'their', 'its', 'her', 'his',
]);

// Address keywords
const ADDRESS_KEYWORDS = new Set([
  'street', 'st', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr', 'lane',
  'ln', 'boulevard', 'blvd', 'court', 'ct', 'place', 'pl', 'apt',
  'apartment', 'suite', 'ste', 'floor', 'fl', 'unit', 'building', 'bldg',
  'highway', 'hwy', 'route', 'rte', 'circle', 'cir', 'way', 'terrace',
  'crescent', 'close', 'park', 'square',
]);

/**
 * Infer the field type from the raw input string and its tokens.
 *
 * Rules (applied in order):
 * 1. Contains @ and . after @ -> email
 * 2. Single token, 3-30 chars, alphanumeric + _ + -, has digit or _ -> username
 * 3. 1-4 tokens, all alphabetic, each 2+ chars -> name
 * 4. 5+ tokens OR contains stopwords -> sentence
 * 5. Contains numbers + address keywords -> address
 * 6. Fallback -> freetext
 */
export function inferFieldType(input: string, tokens: Token[]): FieldType {
  const trimmed = input.trim();

  // Rule 1: Email detection
  const atIndex = trimmed.indexOf('@');
  if (atIndex > 0) {
    const afterAt = trimmed.substring(atIndex + 1);
    if (afterAt.includes('.')) {
      return 'email';
    }
  }

  // Rule 2: Username detection
  if (tokens.length === 1) {
    // Reconstruct original single token (before our tokenizer split on _ and -)
    // We check the raw input instead
    const raw = trimmed;
    if (
      raw.length >= 3 &&
      raw.length <= 30 &&
      /^[a-zA-Z0-9_-]+$/.test(raw) &&
      (/\d/.test(raw) || raw.includes('_'))
    ) {
      return 'username';
    }
  }

  // Also check username when tokenizer split on _ or -
  // but the original input was a single "word" with underscores/digits
  if (tokens.length >= 2) {
    const raw = trimmed;
    if (
      !raw.includes(' ') &&
      !raw.includes('@') &&
      raw.length >= 3 &&
      raw.length <= 30 &&
      /^[a-zA-Z0-9_-]+$/.test(raw) &&
      (/\d/.test(raw) || raw.includes('_'))
    ) {
      return 'username';
    }
  }

  // Rule 5: Address detection (check before name/sentence since addresses
  // can have 1-4 tokens with numbers + keywords)
  const lowerTokens = tokens.map((t) => t.text.toLowerCase());
  const hasNumbers = tokens.some((t) => /\d/.test(t.text));
  const hasAddressKeyword = lowerTokens.some((t) => ADDRESS_KEYWORDS.has(t));
  if (hasNumbers && hasAddressKeyword) {
    return 'address';
  }

  // Rule 4 (early check): Sentence if contains stopwords
  const hasStopwords = lowerTokens.some((t) => STOPWORDS.has(t));
  if (hasStopwords && tokens.length >= 3) {
    return 'sentence';
  }

  // Rule 3: Name detection
  if (tokens.length >= 1 && tokens.length <= 4) {
    const allAlphabetic = tokens.every(
      (t) => t.text.length >= 2 && /^[\p{L}]+$/u.test(t.text),
    );
    if (allAlphabetic) {
      return 'name';
    }
  }

  // Rule 4: 5+ tokens is a sentence
  if (tokens.length >= 5) {
    return 'sentence';
  }

  // Rule 6: Fallback
  return 'freetext';
}
