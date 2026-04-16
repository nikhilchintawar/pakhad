import type { ScorerContext, LoadedLocale } from '../types.js';
import { BloomFilter, MarkovModel } from '@pakhad/train/runtime';

// Curated name list for testing — first names + common surnames
const TEST_NAMES = [
  // First names
  'john', 'james', 'michael', 'sarah', 'jessica', 'david', 'william',
  'elizabeth', 'mary', 'robert', 'jennifer', 'thomas', 'patricia',
  'richard', 'linda', 'matthew', 'daniel', 'margaret', 'joseph',
  'christopher', 'charles', 'barbara', 'andrew', 'nancy', 'susan',
  'hello', 'world', 'test',
  // Surnames
  'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller',
  'davis', 'wilson', 'anderson', 'taylor', 'moore', 'jackson', 'martin',
  'lee', 'thompson', 'white', 'harris', 'clark', 'lewis', 'robinson',
  'walker', 'young', 'king', 'wright', 'baker', 'hall', 'campbell',
];

// Build test models once and reuse
const testMarkov = MarkovModel.train(TEST_NAMES, 3);
const testBloom = BloomFilter.fromItems(TEST_NAMES, 0.001);

export function makeTestLocale(overrides?: Partial<LoadedLocale>): LoadedLocale {
  return {
    id: 'en',
    script: 'Latin',
    markov: testMarkov,
    nameList: testBloom,
    metadata: {
      typicalTokenLength: { min: 2, max: 15, mean: 6 },
      recommendedThresholds: { suspicious: 0.3, gibberish: 0.65 },
    },
    ...overrides,
  };
}

export function makeScorerContext(
  overrides?: Partial<ScorerContext>,
): ScorerContext {
  return {
    fieldType: 'name',
    locale: makeTestLocale(),
    allTokens: ['test'],
    tokenIndex: 0,
    ...overrides,
  };
}
