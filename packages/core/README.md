# @pakhad/core

Gibberish and fake-input detection for text fields. Separates real names, words, and inputs from keyboard-mashed, bot-generated, and fake text.

Built for fintech signups, KYC, and anywhere you need to tell the grain from the chaff.

## Install

```bash
npm install @pakhad/core @pakhad/locale-en
```

## Quick Start

```ts
import { create } from '@pakhad/core';
import en from '@pakhad/locale-en';

const detector = create({ locales: [en] });

// Real name -> clean
detector.detect('Sarah Johnson', { fieldType: 'name' });
// { label: "clean", score: 0.082 }

// Keyboard mash -> gibberish
detector.detect('asdfgh qwerty', { fieldType: 'name' });
// { label: "gibberish", score: 0.785 }
```

## How It Works

Pakhad runs 8 lightweight scorers against each token:

| Scorer | What it detects |
|--------|----------------|
| **markov** | Unlikely character sequences via n-gram model |
| **entropy** | Abnormal character distribution |
| **keyboard_walk** | QWERTY/AZERTY adjacency walks |
| **repetition** | Run-length and pattern repetition |
| **vowel_consonant** | Impossible vowel/consonant ratios |
| **name_list** | Known name lookup via bloom filter |
| **numeric_pattern** | Sequential/repeated digit patterns |
| **length_anomaly** | Extremely short or long tokens |

Each scorer returns a score (0-1) and confidence (0-1). The ensemble combines them via confidence-weighted average per token, then length-weighted mean across tokens.

## Multi-Language Support

```ts
import en from '@pakhad/locale-en';
import indiaLocales from '@pakhad/locale-in';

const detector = create({ locales: [en, ...indiaLocales] });
```

## Field Type Detection

```ts
detector.detect('user@example.com');  // infers: email
detector.detect('cool_user123');       // infers: username
detector.detect('John Doe');           // infers: name
detector.detect('123 Main Street');    // infers: address
```

## Custom Thresholds

```ts
detector.detect(input, {
  thresholds: { suspicious: 0.2, gibberish: 0.5 },
});
```

## Custom Scorers

```ts
detector.registerScorer({
  name: 'my_scorer',
  defaultWeight: 0.3,
  score(token, ctx) {
    return { score: 0, confidence: 0 }; // silent by default
  },
});
```

## Result Shape

```ts
interface DetectResult {
  score: number;              // 0 = clean, 1 = gibberish
  label: "clean" | "suspicious" | "gibberish";
  fieldType: { provided: FieldType | null; inferred: FieldType };
  locale: { mode: LocaleMode; script: string; candidates: string[]; matched: Record<string, string> };
  tokens: Array<{
    text: string;
    score: number;
    label: "clean" | "suspicious" | "gibberish";
    matchedLocale: string;
    scorers: Array<{ name: string; score: number; confidence: number; weight: number; details?: Record<string, unknown> }>;
  }>;
  warnings: string[];
  durationMs: number;
  version: string;
}
```

## Benchmarks

| Metric | Value |
|--------|-------|
| Precision | 100% |
| Recall | 89.8% |
| F1 Score | 94.6% |
| p99 Latency | 0.039ms |

## Packages

| Package | Purpose |
|---------|---------|
| `@pakhad/core` | Detection engine (this package) |
| `@pakhad/locale-en` | English locale (165k names, pre-built models) |
| `@pakhad/locale-in` | Indian languages (Hindi, Marathi, Tamil, + 6 more) |
| `@pakhad/train` | Build custom models from your own data |

## Full Documentation

[github.com/nikhilchintawar/pakhad](https://github.com/nikhilchintawar/pakhad)

## License

MIT
