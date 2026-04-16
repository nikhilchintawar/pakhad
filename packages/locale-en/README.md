# @pakhad/locale-en

English locale pack for [pakhad](https://github.com/nikhilchintawar/pakhad). Ships pre-built models — works out of the box, no training required.

## What's Included

- **Trigram Markov model** — 8,650 character trigrams trained on 165,326 English names
- **Bloom filter name list** — 165,326 names (US Census surnames + SSA baby names), 0.1% false positive rate

**Sources:** US Census Bureau 2010 Surnames (public domain), Social Security Administration baby names (public domain)

## Install

```bash
npm install @pakhad/core @pakhad/locale-en
```

## Usage

```ts
import { create } from '@pakhad/core';
import en from '@pakhad/locale-en';

const detector = create({ locales: [en] });

detector.detect('John Smith', { fieldType: 'name' });
// { label: "clean", score: 0.075 }

detector.detect('asdfgh qwerty', { fieldType: 'name' });
// { label: "gibberish", score: 0.785 }
```

## Combine with Other Locales

```ts
import en from '@pakhad/locale-en';
import indiaLocales from '@pakhad/locale-in';

const detector = create({ locales: [en, ...indiaLocales] });
```

## Model Details

```
Markov model:  8,650 trigrams, 77 KB
Bloom filter:  165,326 names, 297 KB, 10 hash functions, 0.1% FPR
```

## Building Your Own

If you need a custom English corpus, use `@pakhad/train`:

```bash
npx pakhad-train markov --input your-names.txt --order 3 --output markov.bin
npx pakhad-train namelist --input your-names.txt --fpr 0.001 --output names.bloom
```

## Full Documentation

[github.com/nikhilchintawar/pakhad](https://github.com/nikhilchintawar/pakhad)

## License

MIT
