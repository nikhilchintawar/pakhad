// @pakhad/core — gibberish and fake-input detection engine

export { create } from './detector.js';
export { tokenize } from './tokenizer.js';
export { inferFieldType } from './field-type.js';
export { VERSION } from './version.js';

// Scorers (for custom configurations)
export {
  defaultScorers,
  entropyScorer,
  keyboardWalkScorer,
  repetitionScorer,
  vowelConsonantScorer,
  nameListScorer,
  markovScorer,
  numericPatternScorer,
  lengthAnomalyScorer,
} from './scorers/index.js';

// Types
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
} from './types.js';
