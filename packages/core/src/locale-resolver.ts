import type { LoadedLocale, LocaleMode, Token } from './types.js';

/**
 * Detect the primary script of a string using Unicode script property.
 */
export function detectScript(text: string): string {
  // Check for Devanagari
  if (/\p{Script=Devanagari}/u.test(text)) return 'Devanagari';
  // Check for Tamil
  if (/\p{Script=Tamil}/u.test(text)) return 'Tamil';
  // Check for Telugu
  if (/\p{Script=Telugu}/u.test(text)) return 'Telugu';
  // Check for Kannada
  if (/\p{Script=Kannada}/u.test(text)) return 'Kannada';
  // Check for Malayalam
  if (/\p{Script=Malayalam}/u.test(text)) return 'Malayalam';
  // Check for Bengali
  if (/\p{Script=Bengali}/u.test(text)) return 'Bengali';
  // Check for Gujarati
  if (/\p{Script=Gujarati}/u.test(text)) return 'Gujarati';
  // Check for Gurmukhi (Punjabi)
  if (/\p{Script=Gurmukhi}/u.test(text)) return 'Gurmukhi';
  // Check for CJK
  if (/\p{Script=Han}/u.test(text)) return 'Han';
  // Check for Arabic
  if (/\p{Script=Arabic}/u.test(text)) return 'Arabic';
  // Check for Cyrillic
  if (/\p{Script=Cyrillic}/u.test(text)) return 'Cyrillic';
  // Default to Latin
  if (/\p{Script=Latin}/u.test(text)) return 'Latin';

  return 'Unknown';
}

/**
 * Resolve which locales to use for scoring based on the locale mode,
 * available locales, and the detected script.
 */
export function resolveLocales(
  mode: LocaleMode,
  availableLocales: LoadedLocale[],
  input: string,
): { script: string; candidates: LoadedLocale[] } {
  const script = detectScript(input);

  if (mode === 'auto') {
    // Filter to locales matching the detected script
    const scriptMatch = availableLocales.filter((l) => l.script === script);
    if (scriptMatch.length > 0) {
      return { script, candidates: scriptMatch };
    }
    // Fall back to all available locales
    return { script, candidates: availableLocales };
  }

  const requestedIds = Array.isArray(mode) ? mode : [mode];
  const matched = availableLocales.filter((l) => requestedIds.includes(l.id));

  if (matched.length > 0) {
    return { script, candidates: matched };
  }

  // Requested locales not found — fall back to all
  return { script, candidates: availableLocales };
}

/**
 * For each token, determine which locale is the best match.
 * Uses the name list as the primary signal — if a token is a known name
 * in a locale, that locale matches.
 */
export function matchTokenLocales(
  tokens: Token[],
  candidates: LoadedLocale[],
): Record<string, string> {
  const matched: Record<string, string> = {};

  for (const token of tokens) {
    const lower = token.text.toLowerCase();
    let bestLocale = candidates[0]?.id ?? 'unknown';

    for (const locale of candidates) {
      if (locale.nameList.has(lower)) {
        bestLocale = locale.id;
        break;
      }
    }

    matched[token.text] = bestLocale;
  }

  return matched;
}
