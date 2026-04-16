# Training Pipeline

End-to-end guide: from raw corpus data to production-ready locale models.

## Overview

```
Raw Data (CSV, text files, databases)
  |
  v
Preprocessing (clean, deduplicate, filter)
  |
  v
Training (MarkovModel.train, BloomFilter.fromItems, or pakhad-train CLI)
  |
  v
Validation (sanity check scores, spot-check names)
  |
  v
Packaging (create a locale pack module)
  |
  v
Deployment (import in your app)
```

## Step 1: Source Your Corpus

### Public Sources

**English names:**
- [US Census 2010 Surnames](https://www.census.gov/topics/genealogy/data/2010_surnames.html) -- 162k surnames, public domain
- [US SSA Baby Names](https://www.ssa.gov/oact/babynames/) -- names by year since 1880, public domain
- [UK ONS Baby Names](https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/babynamesenglandandwales) -- Open Government License

**Indian names:**
- Wikipedia person-article titles from Indian-language editions
- [AI4Bharat IndicNLP](https://indicnlp.ai4bharat.org/) -- open corpora for Indian languages
- State election commission public voter lists

**Your own data:**
- User sign-up databases (with appropriate privacy handling)
- Customer name fields from your application
- Industry-specific name lists (medical, legal, financial)

### Corpus Format

One name per line, UTF-8:

```
john
sarah
michael
jessica
```

## Step 2: Preprocess

```bash
# Basic preprocessing: lowercase, sort, deduplicate, filter to alpha-only 2+ chars
cat raw-names.txt \
  | tr '[:upper:]' '[:lower:]' \
  | sort -u \
  | grep -E '^[a-z]{2,}$' \
  > cleaned-names.txt
```

For CSV sources:

```bash
# US Census surnames CSV: extract name column, skip header
tail -n +2 Names_2010Census.csv | cut -d',' -f1 | tr '[:upper:]' '[:lower:]' > surnames.txt

# SSA baby names CSV: extract name column
tail -n +2 baby-names.csv | cut -d',' -f2 | tr -d '"' | tr '[:upper:]' '[:lower:]' | sort -u > first-names.txt

# Merge
cat surnames.txt first-names.txt | sort -u | grep -E '^[a-z]{2,}$' > en-names.txt
```

**Quality checks:**
- Remove entries shorter than 2 characters
- Remove entries longer than 50 characters
- Remove entries with non-letter characters (for name corpora)
- Deduplicate
- Spot-check for garbage entries

## Step 3: Train Models

### Option A: CLI

```bash
# Build trigram Markov model
pakhad-train markov \
  --input cleaned-names.txt \
  --order 3 \
  --output models/markov.bin

# Build bloom filter name list
pakhad-train namelist \
  --input cleaned-names.txt \
  --fpr 0.001 \
  --output models/names.bloom
```

### Option B: Programmatic

```ts
import { MarkovModel, BloomFilter } from '@pakhad/train';
import { readFileSync, writeFileSync } from 'node:fs';

const names = readFileSync('cleaned-names.txt', 'utf-8')
  .split('\n')
  .filter(Boolean);

// Markov model
const markov = MarkovModel.train(names, 3);
writeFileSync('models/markov.bin', markov.serialize());

// Bloom filter
const bloom = BloomFilter.fromItems(names, 0.001);
writeFileSync('models/names.bloom', bloom.serialize());
```

## Step 4: Validate

### Check model stats

```bash
pakhad-train info models/markov.bin
pakhad-train info models/names.bloom
```

### Score known-good and known-bad inputs

```ts
import { MarkovModel, BloomFilter } from '@pakhad/train/runtime';
import { readFileSync } from 'node:fs';

const markov = MarkovModel.deserialize(
  new Uint8Array(readFileSync('models/markov.bin').buffer)
);
const bloom = BloomFilter.deserialize(
  new Uint8Array(readFileSync('models/names.bloom').buffer)
);

// These should score LOW (clean)
for (const name of ['john', 'sarah', 'michael', 'jennifer']) {
  console.log(`${name}: markov=${markov.scoreToken(name).score.toFixed(3)}, bloom=${bloom.has(name)}`);
}

// These should score HIGH (gibberish)
for (const g of ['xkqzvb', 'asdfgh', 'zzzzz']) {
  console.log(`${g}: markov=${markov.scoreToken(g).score.toFixed(3)}, bloom=${bloom.has(g)}`);
}
```

**What to look for:**
- Real names: Markov score below 0.4, bloom returns `true`
- Gibberish: Markov score above 0.7, bloom returns `false`
- If real names score high, your corpus may be too small or missing common names

### Run the full detector

```ts
import { create } from '@pakhad/core';

const detector = create({
  locales: [{
    id: 'custom',
    script: 'Latin',
    markov,
    nameList: bloom,
    metadata: { typicalTokenLength: { min: 2, max: 15, mean: 6 } },
  }],
});

// Test against your expected inputs
const result = detector.detect('John Smith', { fieldType: 'name' });
console.log(result.label, result.score);  // Should be "clean", < 0.3
```

## Step 5: Package as a Locale

Create a reusable module:

```ts
// my-locale/index.ts
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BloomFilter, MarkovModel } from '@pakhad/train/runtime';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadModel(filename: string): Uint8Array {
  const data = readFileSync(resolve(__dirname, '../models', filename));
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

const myLocale = {
  id: 'my-locale',
  script: 'Latin',
  markov: MarkovModel.deserialize(loadModel('markov.bin')),
  nameList: BloomFilter.deserialize(loadModel('names.bloom')),
  metadata: {
    typicalTokenLength: { min: 2, max: 15, mean: 6 },
    recommendedThresholds: { suspicious: 0.3, gibberish: 0.65 },
  },
};

export default myLocale;
```

## Step 6: Deploy

```ts
import { create } from '@pakhad/core';
import en from '@pakhad/locale-en';
import myLocale from './my-locale';

const detector = create({ locales: [en, myLocale] });
```

## Tips

- **Bigger corpus = better accuracy.** 10k+ names is a good minimum for production.
- **Include both first names and surnames.** Pakhad tokenizes "John Smith" into two tokens and scores each independently.
- **Include names that other systems false-positive on.** Irish names (Siobhan, Niamh), Vietnamese names (Nguyen, Tran), etc.
- **Rebuild models when your corpus changes.** Binary models are not append-only; retrain from the full corpus.
- **Use the info command to verify models** before deploying. Check n-gram count and FPR look reasonable.
- **Version your models.** The `version` field in `DetectResult` helps track which models produced which results.
