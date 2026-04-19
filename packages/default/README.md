# @pakhad/default

Zero-config [pakhad](https://github.com/nikhilchintawar/pakhad) — pre-loaded with English and all 9 Indian locales. Install and use, no setup.

## Install

```bash
npm install @pakhad/default
```

## Usage

```ts
import { detect } from '@pakhad/default';

detect('John Smith');
// { label: 'clean', score: 0.075, ... }

detect('asdfgh qwerty');
// { label: 'gibberish', score: 0.7, ... }

detect('Rahul Sharma');
// { label: 'clean', score: 0.086, ... }
```

That's it. One import, one function call.

## What's Included

- `@pakhad/core` — detection engine
- `@pakhad/locale-en` — English (165k names)
- `@pakhad/locale-in` — Hindi, Marathi, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Punjabi (9k+ names each)

All re-exported from `@pakhad/default`, so you can do everything without installing individual packages:

```ts
import { create, tokenize, inferFieldType, en, indiaLocales, hi } from '@pakhad/default';
```

## Custom Options

`detect()` accepts the same options as the core API:

```ts
import { detect } from '@pakhad/default';

detect('John Smith', { fieldType: 'name' });
detect('rahul', { locale: 'in-hi' });
detect('xkqzvb', { thresholds: { suspicious: 0.2, gibberish: 0.4 } });
```

## Access the Underlying Detector

```ts
import { detector } from '@pakhad/default';

detector.registerScorer({ /* custom scorer */ });
detector.detect('anything');
```

## When to Use `@pakhad/core` Instead

- You want only English or only specific Indian locales (smaller bundle)
- You need custom locale packs
- You want to build models from your own data

```bash
npm install @pakhad/core @pakhad/locale-en
```

## Full Documentation

[github.com/nikhilchintawar/pakhad](https://github.com/nikhilchintawar/pakhad)

## License

MIT
