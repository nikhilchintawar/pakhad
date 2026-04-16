# Locale Guide

Pakhad separates the detection engine (`@pakhad/core`) from language-specific data (locale packs). This guide explains how to use existing locale packs and build your own.

## Using Locale Packs

### Out of the Box

Install a locale pack alongside core:

```bash
npm install @pakhad/core @pakhad/locale-en
```

```ts
import { create } from '@pakhad/core';
import en from '@pakhad/locale-en';

const detector = create({ locales: [en] });
```

### Multiple Locales

When your users span multiple languages, provide multiple locale packs:

```ts
import en from '@pakhad/locale-en';
import { hi, mr, ta } from '@pakhad/locale-in';

const detector = create({
  locales: [en, hi, mr, ta],
  defaults: { locale: 'auto' },
});
```

With `locale: 'auto'`, pakhad detects the input script (Latin, Devanagari, Tamil, etc.) and selects matching locales for scoring. A Hindi name won't be scored against the English Markov model.

### Forcing a Locale

```ts
// Only use English models
detector.detect(input, { locale: 'en' });

// Try Hindi and Marathi
detector.detect(input, { locale: ['in-hi', 'in-mr'] });
```

## Building Custom Locale Packs

### Why Build Your Own?

- You have industry-specific names (medical, legal, financial)
- You need a language not yet shipped as a package
- You have a proprietary name database
- You want higher accuracy for your specific user base

### What a Locale Pack Contains

```ts
interface LoadedLocale {
  id: string;           // e.g. "en", "in-mr"
  script: string;       // e.g. "Latin", "Devanagari"
  markov: MarkovModel;  // character n-gram model
  nameList: BloomFilter; // known names
  dictionary?: BloomFilter; // optional word list
  metadata: {
    typicalTokenLength: { min: number; max: number; mean: number };
    recommendedThresholds?: { suspicious: number; gibberish: number };
  };
}
```

### Step 1: Prepare Your Corpus

Create a text file with one name per line, lowercase:

```
# corpora/my-names.txt
john
sarah
michael
jessica
...
```

**Corpus sourcing ideas:**
- US Census Bureau name frequency lists (public domain)
- UK ONS baby name data (open license)
- State electoral roll data (publicly available in many countries)
- Wikipedia person-article titles
- Your own user database (with appropriate privacy handling)

### Step 2: Build Models

#### Using the CLI (coming in v0.2.0)

```bash
npx @pakhad/train markov \
  --input corpora/my-names.txt \
  --order 3 \
  --output models/markov.bin

npx @pakhad/train namelist \
  --input corpora/my-names.txt \
  --false-positive-rate 0.001 \
  --output models/names.bloom
```

#### Using the Programmatic API

```ts
import { MarkovModel, BloomFilter } from '@pakhad/train';
import { readFileSync, writeFileSync } from 'node:fs';

// Load corpus
const names = readFileSync('corpora/my-names.txt', 'utf-8')
  .split('\n')
  .map(n => n.trim().toLowerCase())
  .filter(Boolean);

// Build Markov model (trigram)
const markov = MarkovModel.train(names, 3);
writeFileSync('models/markov.bin', markov.serialize());

// Build bloom filter
const bloom = BloomFilter.fromItems(names, 0.001);
writeFileSync('models/names.bloom', bloom.serialize());

console.log(`Markov: ${markov.size} trigrams`);
console.log(`Bloom: ${bloom.getItemCount()} names, FPR: ${bloom.estimatedFalsePositiveRate()}`);
```

### Step 3: Create Your Locale Pack

```ts
// my-locale/index.ts
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BloomFilter, MarkovModel } from '@pakhad/train/runtime';

const __dirname = dirname(fileURLToPath(import.meta.url));

const myLocale = {
  id: 'my-locale',
  script: 'Latin',
  markov: MarkovModel.deserialize(
    new Uint8Array(readFileSync(resolve(__dirname, '../models/markov.bin')).buffer)
  ),
  nameList: BloomFilter.deserialize(
    new Uint8Array(readFileSync(resolve(__dirname, '../models/names.bloom')).buffer)
  ),
  metadata: {
    typicalTokenLength: { min: 2, max: 15, mean: 6 },
    recommendedThresholds: { suspicious: 0.3, gibberish: 0.65 },
  },
};

export default myLocale;
```

### Step 4: Use It

```ts
import { create } from '@pakhad/core';
import myLocale from './my-locale';

const detector = create({ locales: [myLocale] });
const result = detector.detect('some input');
```

## Model Formats

### Markov Model Binary Format

```
[4 bytes] Magic: 0x4D4B4F56 ("MKOV")
[4 bytes] Version: 1
[4 bytes] Order (uint32 LE) -- n-gram order
[4 bytes] Number of entries (uint32 LE)
[4 bytes] Alphabet size (uint32 LE)
For each entry:
  [2 bytes] Key length (uint16 LE)
  [N bytes] Key (UTF-8)
  [4 bytes] Log-probability (float32 LE)
```

### Bloom Filter Binary Format

```
[4 bytes] Magic: 0x424C4F4D ("BLOM")
[4 bytes] Version: 1
[4 bytes] Number of bits (uint32 LE)
[4 bytes] Number of hash functions (uint32 LE)
[4 bytes] Item count (uint32 LE)
[N bytes] Bit array (ceil(numBits / 8) bytes)
```

## Tuning Recommendations

- **False positive rate**: 0.001 (0.1%) is a good default for name lists. Lower rates need more memory.
- **Markov order**: 3 (trigram) works well for most Latin-script languages. Order 2 (bigram) for very short names.
- **Corpus size**: More names = better accuracy. 10,000+ names is a good starting point.
- **Thresholds**: Start with defaults (suspicious: 0.3, gibberish: 0.65) and adjust based on your false positive/negative rates.
