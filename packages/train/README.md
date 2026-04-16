# @pakhad/train

Training pipeline and runtime serialization for [pakhad](https://github.com/nikhilchintawar/pakhad) locale models. Build Markov models and bloom filter name lists from your own data.

## Install

```bash
npm install @pakhad/train
```

## CLI

```bash
# Build a trigram Markov model
npx pakhad-train markov --input names.txt --order 3 --output markov.bin

# Build a bloom filter name list
npx pakhad-train namelist --input names.txt --fpr 0.001 --output names.bloom

# Inspect a model file
npx pakhad-train info markov.bin
```

### Input Format

One name per line, UTF-8. Automatically lowercased, deduplicated, and filtered.

```
john
sarah
michael
jessica
```

## Programmatic API

### MarkovModel

Train character n-gram models from a corpus of strings.

```ts
import { MarkovModel } from '@pakhad/train';

// Train
const model = MarkovModel.train(['john', 'james', 'jessica'], 3);

// Score tokens
model.scoreToken('john');    // { score: 0.26, avgLogProb: -2.1 } — normal
model.scoreToken('xkqzvb'); // { score: 0.93, avgLogProb: -14.6 } — gibberish

// Serialize/deserialize
import { writeFileSync, readFileSync } from 'node:fs';
writeFileSync('markov.bin', model.serialize());

const restored = MarkovModel.deserialize(
  new Uint8Array(readFileSync('markov.bin').buffer)
);
```

**Properties:** `model.order`, `model.alphabetSize`, `model.size`

**Methods:** `train()`, `scoreToken()`, `getLogProb()`, `serialize()`, `deserialize()`

### BloomFilter

Probabilistic set membership with configurable false positive rate.

```ts
import { BloomFilter } from '@pakhad/train';

// Create from items
const bf = BloomFilter.fromItems(['john', 'sarah', 'michael'], 0.001);

bf.has('john');    // true
bf.has('xkqzvb'); // false

// Or build incrementally
const bf2 = BloomFilter.create(10000, 0.001);
bf2.add('john');
bf2.add('sarah');

// Serialize/deserialize
writeFileSync('names.bloom', bf.serialize());
const restored = BloomFilter.deserialize(
  new Uint8Array(readFileSync('names.bloom').buffer)
);
```

**Properties:** `bf.numBits`, `bf.numHashes`

**Methods:** `create()`, `fromItems()`, `optimalConfig()`, `add()`, `has()`, `serialize()`, `deserialize()`, `getItemCount()`, `estimatedFalsePositiveRate()`

## Use Custom Models with pakhad

```ts
import { create } from '@pakhad/core';
import { MarkovModel, BloomFilter } from '@pakhad/train';

const names = ['your', 'custom', 'name', 'list'];
const detector = create({
  locales: [{
    id: 'custom',
    script: 'Latin',
    markov: MarkovModel.train(names, 3),
    nameList: BloomFilter.fromItems(names, 0.001),
    metadata: { typicalTokenLength: { min: 2, max: 15, mean: 6 } },
  }],
});

detector.detect('your input here');
```

## Binary Formats

**Markov (MKOV):** `[magic 4B][version 4B][order 4B][entries 4B][alphabetSize 4B][...entries]`

**Bloom (BLOM):** `[magic 4B][version 4B][numBits 4B][numHashes 4B][itemCount 4B][...bitArray]`

## Full Documentation

[github.com/nikhilchintawar/pakhad](https://github.com/nikhilchintawar/pakhad)

## License

MIT
