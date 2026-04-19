/**
 * @pakhad/default — zero-config pakhad.
 *
 * Ships with a pre-configured detector loaded with English + all 9 Indian locales.
 * Import and use — no setup required.
 *
 * ```ts
 * import { detect } from '@pakhad/default';
 *
 * detect('John Smith');      // { label: 'clean', score: 0.075, ... }
 * detect('asdfgh qwerty');  // { label: 'gibberish', score: 0.7, ... }
 * ```
 *
 * For more control (custom locales, custom scorers, custom thresholds),
 * use `@pakhad/core` directly.
 */
import { create } from '@pakhad/core';
import type { DetectOptions, DetectResult, Detector } from '@pakhad/core';
import en from '@pakhad/locale-en';
import indiaLocales from '@pakhad/locale-in';

/**
 * Pre-configured detector with English + all Indian locales.
 * Use `detector.detect()` or the top-level `detect()` function.
 */
export const detector: Detector = create({
  locales: [en, ...indiaLocales],
  defaults: { locale: 'auto' },
});

/**
 * Top-level detection function — no setup needed.
 *
 * Uses the default detector with English + Indian locales.
 * For custom configurations, use `@pakhad/core`'s `create()`.
 */
export function detect(input: string, options?: DetectOptions): DetectResult {
  return detector.detect(input, options);
}

// Re-export everything from core so users only need to install @pakhad/default
export {
  create,
  tokenize,
  inferFieldType,
  VERSION,
  defaultScorers,
  markovScorer,
  entropyScorer,
  keyboardWalkScorer,
  repetitionScorer,
  vowelConsonantScorer,
  nameListScorer,
  numericPatternScorer,
  lengthAnomalyScorer,
} from '@pakhad/core';

export type {
  FieldType,
  LocaleMode,
  LoadedLocale,
  LocaleMetadata,
  Scorer,
  ScorerContext,
  ScorerResult,
  ScorerName,
  DetectOptions,
  DetectResult,
  TokenResult,
  TokenScorerDetail,
  Token,
  Detector,
  DetectorConfig,
} from '@pakhad/core';

// Re-export individual locales so users can still pick-and-choose if needed
export { default as en } from '@pakhad/locale-en';
export { default as indiaLocales, hi, mr, ta, te, kn, ml, bn, gu, pa } from '@pakhad/locale-in';
