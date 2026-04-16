# API Reference

## `@pakhad/core`

### `create(config: DetectorConfig): Detector`

Create a stateful detector instance.

```ts
import { create } from '@pakhad/core';
import en from '@pakhad/locale-en';

const detector = create({
  locales: [en],
  defaults: {
    fieldType: undefined,  // auto-infer
    locale: 'auto',        // script-gated ensemble
  },
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | `DetectorConfig` | Yes | Configuration object |

**`DetectorConfig`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locales` | `LoadedLocale[]` | Yes | At least one locale pack |
| `defaults.fieldType` | `FieldType` | No | Default field type (overridden by detect options) |
| `defaults.locale` | `LocaleMode` | No | Default locale mode |

**Returns:** `Detector` — an object with `detect()` and `registerScorer()` methods.

**Throws:** `Error` if `locales` array is empty.

---

### `detector.detect(input: string, options?: DetectOptions): DetectResult`

Analyze a string for gibberish content.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | `string` | Yes | The text to analyze |
| `options` | `DetectOptions` | No | Override defaults for this call |

**`DetectOptions`**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `fieldType` | `FieldType` | Auto-inferred | What kind of field this input came from |
| `locale` | `LocaleMode` | `"auto"` | Which locale(s) to use for scoring |
| `thresholds.suspicious` | `number` | `0.3` | Score at or above this is "suspicious" |
| `thresholds.gibberish` | `number` | `0.65` | Score at or above this is "gibberish" |
| `scorers` | `Record<ScorerName, ScorerOverride>` | `{}` | Per-scorer enable/disable and weight overrides |

**`ScorerOverride`**: `{ enabled?: boolean; weight?: number }`

**Returns:** `DetectResult` (see below).

---

### `DetectResult`

The full result object returned by `detector.detect()`.

| Field | Type | Description |
|-------|------|-------------|
| `score` | `number` | Aggregate gibberish score. 0 = clean, 1 = definitely gibberish. |
| `label` | `"clean" \| "suspicious" \| "gibberish"` | Human-readable classification based on score vs thresholds. |
| `fieldType.provided` | `FieldType \| null` | The field type you passed in options, or `null` if not provided. |
| `fieldType.inferred` | `FieldType` | The field type pakhad detected from the input. |
| `locale.mode` | `LocaleMode` | The locale mode used (`"auto"`, a string, or an array). |
| `locale.script` | `string` | Detected Unicode script (e.g. `"Latin"`, `"Devanagari"`). |
| `locale.candidates` | `string[]` | Locale IDs that were considered for scoring. |
| `locale.matched` | `Record<string, string>` | Map of token text to the locale ID that best matched it. |
| `tokens` | `TokenResult[]` | Per-token breakdown (see below). |
| `warnings` | `string[]` | Diagnostic warnings. Currently: `"field_type_mismatch"` when provided and inferred field types disagree. |
| `durationMs` | `number` | Time taken for detection in milliseconds. |
| `version` | `string` | Pakhad version string for reproducibility. |

**`TokenResult`**

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | The token text (original case preserved). |
| `score` | `number` | Aggregate gibberish score for this token (0-1). |
| `label` | `"clean" \| "suspicious" \| "gibberish"` | Classification for this token. |
| `matchedLocale` | `string` | Locale ID selected for this token. |
| `scorers` | `TokenScorerDetail[]` | Per-scorer results for this token (see below). |

**`TokenScorerDetail`**

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Scorer name (e.g. `"markov"`, `"keyboard_walk"`). |
| `score` | `number` | This scorer's gibberish score for the token (0-1). |
| `confidence` | `number` | How sure this scorer is (0-1). 0 = no opinion (silent). |
| `weight` | `number` | The weight used for this scorer in the ensemble. |
| `details` | `Record<string, unknown> \| undefined` | Scorer-specific diagnostic data. |

---

### `detector.registerScorer(scorer: Scorer): void`

Register a custom scorer or replace an existing built-in scorer by name. If a scorer with the same `name` already exists, it is replaced.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scorer` | `Scorer` | Yes | The scorer to register |

**Returns:** `void`

**`Scorer`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique scorer name. If it matches a built-in name (e.g. `"entropy"`), that scorer is replaced. |
| `defaultWeight` | `number` | Yes | Base weight in the ensemble (0-1). Higher = more influence. |
| `minLength` | `number` | No | Skip tokens shorter than this many characters. |
| `score` | `(token: string, ctx: ScorerContext) => ScorerResult` | Yes | Scoring function. Called once per token. |

**`ScorerResult`**

| Field | Type | Description |
|-------|------|-------------|
| `score` | `number` | 0-1, how gibberish-like this token is. 0 = clean, 1 = gibberish. |
| `confidence` | `number` | 0-1, how sure this scorer is about its score. **Return 0 to stay silent** (the scorer is excluded from the ensemble for this token). |
| `details` | `Record<string, unknown>` | Optional. Diagnostic info included in the result for debugging. |

**`ScorerContext`**

| Field | Type | Description |
|-------|------|-------------|
| `fieldType` | `FieldType` | The effective field type for this detection. |
| `locale` | `LoadedLocale` | The locale selected for this token. |
| `allTokens` | `string[]` | All token texts in the input (so scorers can see neighbors). |
| `tokenIndex` | `number` | Index of the current token in `allTokens`. |

```ts
detector.registerScorer({
  name: 'domain_check',
  defaultWeight: 0.15,
  minLength: 3,
  score(token, ctx) {
    return { score: 0, confidence: 0.5, details: { checked: true } };
  },
});
```

---

### `tokenize(input: string): Token[]`

Tokenize input according to pakhad rules. Exported for advanced use cases.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | `string` | Yes | The text to tokenize |

**Returns:** `Token[]` — array of tokens with position information.

**`Token`**

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | The token text with original case preserved. |
| `start` | `number` | Start index in the original input string (inclusive). |
| `end` | `number` | End index in the original input string (exclusive). `input.substring(start, end) === text`. |

**Tokenization rules:**
- Split on whitespace (space, tab, newline)
- Split on delimiter characters: `@ . _ - / \ |`
- Split on digit/letter transitions (`"rahul123"` becomes `["rahul", "123"]`)
- Split on camelCase boundaries (`"CamelCase"` becomes `["Camel", "Case"]`)
- Preserve acronyms (`"URL"` stays as `["URL"]`, not `["U", "R", "L"]`)
- Handle uppercase runs followed by lowercase (`"XMLParser"` becomes `["XML", "Parser"]`)

```ts
import { tokenize } from '@pakhad/core';

tokenize('CamelCase123');
// [{ text: 'Camel', start: 0, end: 5 },
//  { text: 'Case', start: 5, end: 9 },
//  { text: '123', start: 9, end: 12 }]

tokenize('user@example.com');
// [{ text: 'user', start: 0, end: 4 },
//  { text: 'example', start: 5, end: 12 },
//  { text: 'com', start: 13, end: 16 }]

tokenize('');  // []
```

---

### `inferFieldType(input: string, tokens: Token[]): FieldType`

Auto-detect the field type from the raw input and its tokens. Exported for advanced use cases.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | `string` | Yes | The raw input string |
| `tokens` | `Token[]` | Yes | Tokens from `tokenize(input)` |

**Returns:** `FieldType` — one of:

| Value | Detection Rule |
|-------|---------------|
| `"email"` | Contains `@` with `.` after the `@` |
| `"username"` | Single continuous string, 3-30 chars, alphanumeric with `_` or `-`, contains a digit or underscore |
| `"name"` | 1-4 tokens, all alphabetic, each 2+ chars, no stopwords |
| `"sentence"` | 5+ tokens, or 3+ tokens containing common English stopwords |
| `"address"` | Contains numbers + address keywords (street, ave, apt, etc.) |
| `"freetext"` | Fallback when no other rule matches |

```ts
import { inferFieldType, tokenize } from '@pakhad/core';

inferFieldType('user@example.com', tokenize('user@example.com'));  // "email"
inferFieldType('cool_user123', tokenize('cool_user123'));           // "username"
inferFieldType('John Doe', tokenize('John Doe'));                   // "name"
inferFieldType('the quick brown fox', tokenize('the quick brown fox')); // "sentence"
inferFieldType('123 Main Street', tokenize('123 Main Street'));     // "address"
inferFieldType('xkqzvb', tokenize('xkqzvb'));                       // "name" (fallback: single alpha token)
```

---

### `VERSION: string`

The pakhad version string. Included in every `DetectResult` for reproducibility.

```ts
import { VERSION } from '@pakhad/core';
console.log(VERSION); // "0.1.0"
```

---

## Types

All types are exported from `@pakhad/core`:

```ts
import type {
  FieldType,          // "name" | "email" | "username" | "sentence" | "address" | "freetext"
  LocaleMode,         // "auto" | string | string[]
  LoadedLocale,       // Locale pack shape (markov, nameList, metadata)
  LocaleMetadata,     // { typicalTokenLength, recommendedThresholds? }
  Scorer,             // Scorer interface
  ScorerContext,      // Context passed to scorer.score()
  ScorerResult,       // Return type of scorer.score()
  ScorerName,         // Built-in scorer names + string
  DetectOptions,      // Options for detect()
  DetectResult,       // Return type of detect()
  TokenResult,        // Per-token result
  TokenScorerDetail,  // Per-scorer detail within a token
  Token,              // Tokenizer output
  Detector,           // Detector instance type
  DetectorConfig,     // Config for create()
} from '@pakhad/core';
```

**`LoadedLocale`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Locale identifier (e.g. `"en"`, `"in-hi"`). |
| `script` | `string` | Yes | Unicode script name (e.g. `"Latin"`, `"Devanagari"`). |
| `markov` | `MarkovModel` | Yes | Trained character n-gram model. |
| `nameList` | `BloomFilter` | Yes | Bloom filter of known names. |
| `dictionary` | `BloomFilter` | No | Optional bloom filter of known words (for sentence-mode scoring). |
| `metadata.typicalTokenLength` | `{ min: number; max: number; mean: number }` | Yes | Expected token length range for this locale. |
| `metadata.recommendedThresholds` | `{ suspicious: number; gibberish: number }` | No | Locale-specific threshold recommendations. |

---

## `@pakhad/train/runtime`

Runtime serialization helpers. Used by locale packs and by applications that build custom models.

### `BloomFilter`

Probabilistic set membership data structure. Uses murmur3 double-hashing for fast lookups with a configurable false positive rate.

#### `BloomFilter.create(expectedItems, falsePositiveRate?): BloomFilter`

Create an empty bloom filter sized for the given parameters.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `expectedItems` | `number` | required | How many items you plan to insert. |
| `falsePositiveRate` | `number` | `0.001` | Target false positive rate (0.001 = 0.1%). |

**Returns:** `BloomFilter` — an empty filter ready for `add()` calls.

```ts
const bf = BloomFilter.create(10000, 0.001);
```

---

#### `BloomFilter.fromItems(items, falsePositiveRate?): BloomFilter`

Create a bloom filter pre-populated with all items from an iterable.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `items` | `Iterable<string>` | required | Strings to insert (e.g. an array of names). |
| `falsePositiveRate` | `number` | `0.001` | Target false positive rate. |

**Returns:** `BloomFilter` — a filter containing all items.

```ts
const bf = BloomFilter.fromItems(['john', 'sarah', 'michael'], 0.001);
bf.has('john');   // true
bf.has('zebra');  // false
```

---

#### `BloomFilter.optimalConfig(expectedItems, falsePositiveRate): BloomFilterConfig`

Calculate optimal bloom filter parameters without creating a filter. Useful for estimating memory requirements.

| Parameter | Type | Description |
|-----------|------|-------------|
| `expectedItems` | `number` | How many items will be inserted. |
| `falsePositiveRate` | `number` | Target false positive rate. |

**Returns:** `BloomFilterConfig`

| Field | Type | Description |
|-------|------|-------------|
| `numBits` | `number` | Optimal number of bits for the bit array. |
| `numHashes` | `number` | Optimal number of hash functions. |

```ts
const config = BloomFilter.optimalConfig(100000, 0.001);
// { numBits: 1437759, numHashes: 10 }
```

---

#### `BloomFilter.deserialize(data): BloomFilter`

Restore a bloom filter from its binary representation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Uint8Array` | Binary data from `serialize()`. |

**Returns:** `BloomFilter`

**Throws:** `Error` if the data is too short, has an invalid magic number (`0x424C4F4D` / "BLOM" expected), or unsupported version.

```ts
import { readFileSync } from 'node:fs';
const data = readFileSync('models/names.bloom');
const bf = BloomFilter.deserialize(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
```

---

#### `bf.add(key): void`

Insert a string into the bloom filter.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | The string to insert. |

**Returns:** `void`

```ts
bf.add('newname');
bf.has('newname'); // true
```

---

#### `bf.has(key): boolean`

Test whether a string is probably in the set.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | The string to look up. |

**Returns:** `boolean`
- `true` — the item is **probably** in the set (with a false positive rate determined by the filter's configuration).
- `false` — the item is **definitely not** in the set.

```ts
bf.has('john');    // true (inserted)
bf.has('xkqzvb'); // false (definitely not inserted)
```

---

#### `bf.serialize(): Uint8Array`

Serialize the bloom filter to a compact binary format.

**Returns:** `Uint8Array` — binary data that can be written to disk and restored with `BloomFilter.deserialize()`.

**Binary format:**
```
[4 bytes] Magic: 0x424C4F4D ("BLOM")
[4 bytes] Version: 1
[4 bytes] numBits (uint32 LE)
[4 bytes] numHashes (uint32 LE)
[4 bytes] itemCount (uint32 LE)
[N bytes] Bit array (ceil(numBits / 8) bytes)
```

```ts
const binary = bf.serialize();
writeFileSync('names.bloom', binary);
```

---

#### `bf.getItemCount(): number`

**Returns:** `number` — the number of items that were inserted via `add()`. Informational only (the bloom filter doesn't store the items themselves).

---

#### `bf.estimatedFalsePositiveRate(): number`

**Returns:** `number` — the estimated current false positive rate based on the number of items inserted, the number of bits, and the number of hash functions. Value between 0 and 1.

```ts
const fpr = bf.estimatedFalsePositiveRate();
console.log(`${(fpr * 100).toFixed(4)}%`);  // "0.1000%"
```

---

#### `bf.numBits: number` (readonly)

The total number of bits in the bit array.

#### `bf.numHashes: number` (readonly)

The number of hash functions used (simulated via double-hashing).

---

### `MarkovModel`

Character n-gram transition probability model. Stores log-probabilities for character sequences, trained from a corpus of strings.

#### `MarkovModel.train(corpus, order?): MarkovModel`

Train a new Markov model from a corpus of strings.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `corpus` | `string[]` | required | Array of training strings (e.g. a list of names). Automatically lowercased. |
| `order` | `number` | `3` | N-gram order. 2 = bigram, 3 = trigram, 4 = 4-gram. |

**Returns:** `MarkovModel`

The training process:
1. Extracts all n-grams of the given order from each string
2. Counts n-gram frequencies and prefix frequencies
3. Converts to log-probabilities with Laplace smoothing
4. Computes an unseen n-gram penalty (for character sequences not in the training data)

```ts
const model = MarkovModel.train(['john', 'james', 'jessica', 'jennifer'], 3);
console.log(model.size);          // number of unique trigrams
console.log(model.order);         // 3
console.log(model.alphabetSize);  // number of unique characters in corpus
```

---

#### `MarkovModel.deserialize(data): MarkovModel`

Restore a Markov model from its binary representation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Uint8Array` | Binary data from `serialize()`. |

**Returns:** `MarkovModel`

**Throws:** `Error` if the data is too short, has an invalid magic number (`0x4D4B4F56` / "MKOV" expected), or unsupported version.

```ts
import { readFileSync } from 'node:fs';
const data = readFileSync('models/markov.bin');
const model = MarkovModel.deserialize(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
```

---

#### `model.scoreToken(token): { score: number; avgLogProb: number }`

Score a single token against the model.

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string` | The token to score. Automatically lowercased internally. |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `score` | `number` | Gibberish score from 0 to 1. 0 = character sequences are normal for this model. 1 = character sequences are extremely unlikely. |
| `avgLogProb` | `number` | Average log-probability of the token's n-gram transitions. More negative = less likely. Near 0 = very likely. |

If the token is shorter than the model's order, returns `{ score: 0, avgLogProb: 0 }` (not enough data to score).

```ts
model.scoreToken('john');    // { score: 0.26, avgLogProb: -2.1 }  — normal
model.scoreToken('xkqzvb'); // { score: 0.93, avgLogProb: -14.6 } — gibberish
model.scoreToken('ab');      // { score: 0, avgLogProb: 0 }        — too short for trigram
```

---

#### `model.getLogProb(ngram): number`

Get the log-probability for a specific n-gram.

| Parameter | Type | Description |
|-----------|------|-------------|
| `ngram` | `string` | An n-gram string (must be exactly `model.order` characters). |

**Returns:** `number` — the log-probability. Negative values (more negative = less likely). Returns the unseen penalty value for n-grams not in the training data.

```ts
model.getLogProb('joh');  // -1.186 (seen in training data)
model.getLogProb('xkq');  // -12.5  (unseen, gets penalty)
```

---

#### `model.serialize(): Uint8Array`

Serialize the model to a compact binary format.

**Returns:** `Uint8Array` — binary data that can be written to disk and restored with `MarkovModel.deserialize()`.

**Binary format:**
```
[4 bytes] Magic: 0x4D4B4F56 ("MKOV")
[4 bytes] Version: 1
[4 bytes] Order (uint32 LE)
[4 bytes] Number of entries (uint32 LE)
[4 bytes] Alphabet size (uint32 LE)
For each entry:
  [2 bytes] Key length (uint16 LE)
  [N bytes] Key (UTF-8 encoded n-gram)
  [4 bytes] Log-probability (float32 LE)
```

```ts
const binary = model.serialize();
writeFileSync('markov.bin', binary);
```

---

#### `model.order: number` (readonly)

The n-gram order of the model (e.g. 3 for a trigram model).

#### `model.alphabetSize: number` (readonly)

The number of unique characters found in the training corpus.

#### `model.size: number` (readonly getter)

The number of n-gram entries stored in the model.

---

## Built-in Scorers

All 8 built-in scorers are exported individually and as the `defaultScorers` array:

```ts
import {
  markovScorer,
  entropyScorer,
  keyboardWalkScorer,
  repetitionScorer,
  vowelConsonantScorer,
  nameListScorer,
  numericPatternScorer,
  lengthAnomalyScorer,
  defaultScorers,        // array of all 8 in default order
} from '@pakhad/core';
```

Each scorer implements the `Scorer` interface and can be called directly:

```ts
const result = markovScorer.score('xkqzvb', scorerContext);
// { score: 0.931, confidence: 0.667, details: { avgLogProb: -14.6, ... } }
```

| Scorer | `name` | `defaultWeight` | `minLength` | Description |
|--------|--------|-----------------|-------------|-------------|
| `markovScorer` | `"markov"` | 0.25 | 3 | N-gram transition probability against locale model |
| `entropyScorer` | `"entropy"` | 0.12 | 3 | Shannon entropy of character distribution |
| `keyboardWalkScorer` | `"keyboard_walk"` | 0.15 | 4 | QWERTY/AZERTY keyboard adjacency detection |
| `repetitionScorer` | `"repetition"` | 0.12 | 3 | Run-length and substring pattern repetition |
| `vowelConsonantScorer` | `"vowel_consonant"` | 0.10 | 3 | Vowel/consonant ratio and cluster length (Latin only) |
| `nameListScorer` | `"name_list"` | 0.35 | 2 | Bloom filter lookup — hit = clean, miss = silent |
| `numericPatternScorer` | `"numeric_pattern"` | 0.08 | 3 | Sequential/repeated digit detection (all-digit tokens only) |
| `lengthAnomalyScorer` | `"length_anomaly"` | 0.05 | none | Flags single-char and 30+ char tokens |

See [scorer-reference.md](scorer-reference.md) for detailed algorithms and tuning advice.
