# @pakhad/locale-in

Indian language locale packs for [pakhad](https://github.com/nikhilchintawar/pakhad). Ships pre-built romanized (Latin-script) Markov models and name lists for 9 Indian languages.

## Languages

| Locale | Language | Names | Export |
|--------|----------|-------|--------|
| `in-hi` | Hindi | 249 | `hi` |
| `in-mr` | Marathi | 164 | `mr` |
| `in-ta` | Tamil | 96 | `ta` |
| `in-te` | Telugu | 37 | `te` |
| `in-kn` | Kannada | 31 | `kn` |
| `in-ml` | Malayalam | 50 | `ml` |
| `in-bn` | Bengali | 83 | `bn` |
| `in-gu` | Gujarati | 65 | `gu` |
| `in-pa` | Punjabi | 62 | `pa` |

All models use romanized Latin-script names (e.g. "rahul" not "राहुल").

## Install

```bash
npm install @pakhad/core @pakhad/locale-in
```

Usually paired with `@pakhad/locale-en` for combined coverage:

```bash
npm install @pakhad/core @pakhad/locale-en @pakhad/locale-in
```

## Usage

### All Indian locales (recommended)

```ts
import { create } from '@pakhad/core';
import en from '@pakhad/locale-en';
import indiaLocales from '@pakhad/locale-in';

const detector = create({ locales: [en, ...indiaLocales] });

detector.detect('Rahul Sharma', { fieldType: 'name' });
// { label: "clean", score: 0.086 }

detector.detect('xkqzvb wwwxxx', { fieldType: 'name' });
// { label: "gibberish", score: 0.777 }
```

### Individual locales

```ts
import { hi, mr, ta } from '@pakhad/locale-in';

// Only Hindi and Marathi
const detector = create({ locales: [en, hi, mr] });
```

### Force a specific locale

```ts
detector.detect('rahul sharma', { locale: 'in-hi' });
detector.detect('sachin patil', { locale: 'in-mr' });
detector.detect('rajesh kumar', { locale: ['in-hi', 'in-ta'] });
```

## Available Exports

```ts
// Default export: array of all 9 locales
import indiaLocales from '@pakhad/locale-in';

// Named exports: individual locales
import { hi, mr, ta, te, kn, ml, bn, gu, pa } from '@pakhad/locale-in';
```

## Expanding the Corpus

The shipped name lists are curated starter sets. For production with larger corpora, use `@pakhad/train`:

```bash
npx pakhad-train markov --input your-hindi-names.txt --order 3 --output in-hi-markov.bin
npx pakhad-train namelist --input your-hindi-names.txt --fpr 0.001 --output in-hi-names.bloom
```

## Full Documentation

[github.com/nikhilchintawar/pakhad](https://github.com/nikhilchintawar/pakhad)

## License

MIT
