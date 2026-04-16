import type { BloomFilter, MarkovModel } from '@pakhad/train/runtime';

// --- Field Types ---

export type FieldType =
  | 'name'
  | 'email'
  | 'username'
  | 'sentence'
  | 'address'
  | 'freetext';

// --- Locale ---

export type LocaleMode = 'auto' | string | string[];

export interface LocaleMetadata {
  typicalTokenLength: { min: number; max: number; mean: number };
  recommendedThresholds?: { suspicious: number; gibberish: number };
}

export interface LoadedLocale {
  id: string;
  script: string;
  markov: MarkovModel;
  nameList: BloomFilter;
  dictionary?: BloomFilter;
  metadata: LocaleMetadata;
}

// --- Scorer ---

export interface ScorerContext {
  fieldType: FieldType;
  locale: LoadedLocale;
  allTokens: string[];
  tokenIndex: number;
}

export interface ScorerResult {
  score: number;
  confidence: number;
  details?: Record<string, unknown>;
}

export interface Scorer {
  name: string;
  minLength?: number;
  defaultWeight: number;
  score(token: string, ctx: ScorerContext): ScorerResult;
}

export type ScorerName =
  | 'markov'
  | 'entropy'
  | 'keyboard_walk'
  | 'repetition'
  | 'vowel_consonant'
  | 'name_list'
  | 'numeric_pattern'
  | 'length_anomaly'
  | (string & {});

// --- Detection Options ---

export interface DetectOptions {
  fieldType?: FieldType;
  locale?: LocaleMode;
  thresholds?: { suspicious?: number; gibberish?: number };
  scorers?: Partial<
    Record<ScorerName, { enabled?: boolean; weight?: number }>
  >;
}

// --- Detection Result ---

export interface TokenScorerDetail {
  name: string;
  score: number;
  confidence: number;
  weight: number;
  details?: Record<string, unknown>;
}

export interface TokenResult {
  text: string;
  score: number;
  label: 'clean' | 'suspicious' | 'gibberish';
  matchedLocale: string;
  scorers: TokenScorerDetail[];
}

export interface DetectResult {
  score: number;
  label: 'clean' | 'suspicious' | 'gibberish';

  fieldType: {
    provided: FieldType | null;
    inferred: FieldType;
  };

  locale: {
    mode: LocaleMode;
    script: string;
    candidates: string[];
    matched: Record<string, string>;
  };

  tokens: TokenResult[];

  warnings: string[];
  durationMs: number;
  version: string;
}

// --- Tokenizer ---

export interface Token {
  text: string;
  start: number;
  end: number;
}

// --- Detector Instance ---

export interface DetectorConfig {
  locales: LoadedLocale[];
  defaults?: {
    fieldType?: FieldType;
    locale?: LocaleMode;
  };
}

export interface Detector {
  detect(input: string, options?: DetectOptions): DetectResult;
  registerScorer(scorer: Scorer): void;
}
