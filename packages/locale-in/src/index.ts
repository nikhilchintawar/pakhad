import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BloomFilter, MarkovModel } from '@pakhad/train/runtime';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadModel(filename: string): Uint8Array {
  const data = readFileSync(resolve(__dirname, '../models', filename));
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function makeLocale(
  id: string,
  script: string,
  markovFile: string,
  bloomFile: string,
  metadata: { min: number; max: number; mean: number },
) {
  return {
    id,
    script,
    markov: MarkovModel.deserialize(loadModel(markovFile)),
    nameList: BloomFilter.deserialize(loadModel(bloomFile)),
    metadata: {
      typicalTokenLength: metadata,
      recommendedThresholds: { suspicious: 0.3, gibberish: 0.65 },
    },
  } as const;
}

/**
 * Hindi locale — romanized Latin-script Markov model + name list.
 */
export const hi = makeLocale(
  'in-hi', 'Latin',
  'in-hi-markov.bin', 'in-hi-names.bloom',
  { min: 2, max: 15, mean: 6 },
);

/**
 * Marathi locale — romanized Latin-script Markov model + name list.
 */
export const mr = makeLocale(
  'in-mr', 'Latin',
  'in-mr-markov.bin', 'in-mr-names.bloom',
  { min: 2, max: 18, mean: 7 },
);

/**
 * Tamil locale — romanized Latin-script Markov model + name list.
 */
export const ta = makeLocale(
  'in-ta', 'Latin',
  'in-ta-markov.bin', 'in-ta-names.bloom',
  { min: 3, max: 20, mean: 8 },
);

/**
 * Telugu locale — romanized Latin-script Markov model + name list.
 */
export const te = makeLocale(
  'in-te', 'Latin',
  'in-te-markov.bin', 'in-te-names.bloom',
  { min: 3, max: 15, mean: 6 },
);

/**
 * Kannada locale — romanized Latin-script Markov model + name list.
 */
export const kn = makeLocale(
  'in-kn', 'Latin',
  'in-kn-markov.bin', 'in-kn-names.bloom',
  { min: 3, max: 18, mean: 7 },
);

/**
 * Malayalam locale — romanized Latin-script Markov model + name list.
 */
export const ml = makeLocale(
  'in-ml', 'Latin',
  'in-ml-markov.bin', 'in-ml-names.bloom',
  { min: 3, max: 18, mean: 7 },
);

/**
 * Bengali locale — romanized Latin-script Markov model + name list.
 */
export const bn = makeLocale(
  'in-bn', 'Latin',
  'in-bn-markov.bin', 'in-bn-names.bloom',
  { min: 3, max: 18, mean: 7 },
);

/**
 * Gujarati locale — romanized Latin-script Markov model + name list.
 */
export const gu = makeLocale(
  'in-gu', 'Latin',
  'in-gu-markov.bin', 'in-gu-names.bloom',
  { min: 3, max: 15, mean: 6 },
);

/**
 * Punjabi locale — romanized Latin-script Markov model + name list.
 */
export const pa = makeLocale(
  'in-pa', 'Latin',
  'in-pa-markov.bin', 'in-pa-names.bloom',
  { min: 3, max: 15, mean: 7 },
);

/**
 * All Indian locales as an array — spread into create() for full coverage.
 *
 * ```ts
 * import indiaLocales from '@pakhad/locale-in';
 * const detector = create({ locales: [...indiaLocales] });
 * ```
 */
const indiaLocales = [hi, mr, ta, te, kn, ml, bn, gu, pa] as const;
export default indiaLocales;
