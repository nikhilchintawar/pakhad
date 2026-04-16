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

**`DetectorConfig`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locales` | `LoadedLocale[]` | Yes | At least one locale pack |
| `defaults.fieldType` | `FieldType` | No | Default field type (overridden by detect options) |
| `defaults.locale` | `LocaleMode` | No | Default locale mode |

Throws if `locales` is empty.

---

### `detector.detect(input: string, options?: DetectOptions): DetectResult`

Analyze a string for gibberish content.

**`DetectOptions`**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `fieldType` | `FieldType` | Auto-inferred | What kind of field this input came from |
| `locale` | `LocaleMode` | `"auto"` | Which locale(s) to use for scoring |
| `thresholds.suspicious` | `number` | `0.3` | Score threshold for "suspicious" label |
| `thresholds.gibberish` | `number` | `0.65` | Score threshold for "gibberish" label |
| `scorers` | `Record<string, ScorerOverride>` | `{}` | Per-scorer enable/disable and weight overrides |

**`ScorerOverride`**: `{ enabled?: boolean; weight?: number }`

**`FieldType`**: `"name" | "email" | "username" | "sentence" | "address" | "freetext"`

**`LocaleMode`**: `"auto" | string | string[]`
- `"auto"` — detect script, filter locales to matching script
- `"en"` — force English locale only
- `["en", "in-mr"]` — try these specific locales

---

### `DetectResult`

```ts
interface DetectResult {
  score: number;            // 0 = clean, 1 = gibberish
  label: "clean" | "suspicious" | "gibberish";

  fieldType: {
    provided: FieldType | null;  // what was passed in options
    inferred: FieldType;         // what pakhad detected
  };

  locale: {
    mode: LocaleMode;
    script: string;                       // e.g. "Latin", "Devanagari"
    candidates: string[];                 // locale IDs considered
    matched: Record<string, string>;      // token -> best-matching locale
  };

  tokens: Array<{
    text: string;
    score: number;
    label: "clean" | "suspicious" | "gibberish";
    matchedLocale: string;
    scorers: Array<{
      name: string;
      score: number;
      confidence: number;
      weight: number;
      details?: Record<string, unknown>;
    }>;
  }>;

  warnings: string[];        // e.g. ["field_type_mismatch"]
  durationMs: number;
  version: string;
}
```

---

### `detector.registerScorer(scorer: Scorer)`

Register a custom scorer or replace an existing one by name.

```ts
detector.registerScorer({
  name: 'domain_check',
  defaultWeight: 0.15,
  minLength: 3,
  score(token, ctx) {
    // Custom scoring logic
    return { score: 0, confidence: 0.5, details: { checked: true } };
  },
});
```

**`Scorer`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique scorer name |
| `defaultWeight` | `number` | Yes | Base weight in the ensemble |
| `minLength` | `number` | No | Skip tokens shorter than this |
| `score` | `(token, ctx) => ScorerResult` | Yes | Scoring function |

**`ScorerResult`**

| Field | Type | Description |
|-------|------|-------------|
| `score` | `number` | 0-1, how gibberish-like this token is |
| `confidence` | `number` | 0-1, how sure this scorer is (0 = silent/no opinion) |
| `details` | `Record<string, unknown>` | Optional diagnostic info |

**`ScorerContext`**

| Field | Type | Description |
|-------|------|-------------|
| `fieldType` | `FieldType` | Effective field type |
| `locale` | `LoadedLocale` | Locale selected for this token |
| `allTokens` | `string[]` | All tokens in the input |
| `tokenIndex` | `number` | Index of the current token |

---

### `tokenize(input: string): Token[]`

Tokenize input according to pakhad rules. Exported for advanced use cases.

```ts
import { tokenize } from '@pakhad/core';

const tokens = tokenize('CamelCase123');
// [{ text: 'Camel', start: 0, end: 5 }, { text: 'Case', start: 5, end: 9 }, { text: '123', start: 9, end: 12 }]
```

**Tokenization rules:**
- Split on whitespace
- Split on `@ . _ - / \ |`
- Split on digit/letter transitions
- Split on camelCase boundaries (but not acronyms like `URL`)

---

### `inferFieldType(input: string, tokens: Token[]): FieldType`

Auto-detect the field type from the input. Exported for advanced use cases.

```ts
import { inferFieldType, tokenize } from '@pakhad/core';

const tokens = tokenize('user@example.com');
const fieldType = inferFieldType('user@example.com', tokens);
// 'email'
```

---

## `@pakhad/train/runtime`

### `BloomFilter`

Probabilistic set data structure for name list lookups.

```ts
import { BloomFilter } from '@pakhad/train/runtime';

// Create from items
const bf = BloomFilter.fromItems(['john', 'sarah', 'michael'], 0.001);

// Query
bf.has('john');    // true
bf.has('xyzqwe'); // false (with 0.1% FPR)

// Serialize/deserialize
const binary = bf.serialize();    // Uint8Array
const restored = BloomFilter.deserialize(binary);
```

### `MarkovModel`

Character n-gram transition probability model.

```ts
import { MarkovModel } from '@pakhad/train/runtime';

// Train from corpus
const model = MarkovModel.train(['john', 'james', 'jessica'], 3);

// Score a token
const { score, avgLogProb } = model.scoreToken('xkqzvb');
// score: ~0.85 (gibberish), avgLogProb: very negative

// Serialize/deserialize
const binary = model.serialize();     // Uint8Array
const restored = MarkovModel.deserialize(binary);
```

---

## Built-in Scorers

All scorers are exported from `@pakhad/core` for custom configurations:

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
  defaultScorers,
} from '@pakhad/core';
```

| Scorer | Default Weight | Min Length | Description |
|--------|---------------|------------|-------------|
| `markov` | 0.25 | 3 | N-gram transition probability |
| `entropy` | 0.12 | 3 | Shannon entropy analysis |
| `keyboard_walk` | 0.15 | 4 | QWERTY/AZERTY adjacency detection |
| `repetition` | 0.12 | 3 | Run-length and pattern repetition |
| `vowel_consonant` | 0.10 | 3 | Vowel/consonant ratio and clusters |
| `name_list` | 0.35 | 2 | Bloom filter name lookup |
| `numeric_pattern` | 0.08 | 3 | Sequential/repeated digit patterns |
| `length_anomaly` | 0.05 | none | Extremely short/long tokens |
