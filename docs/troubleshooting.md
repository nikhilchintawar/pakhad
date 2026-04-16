# Troubleshooting

Common issues, solutions, and tuning advice.

## False Positives (real names flagged as gibberish)

### Problem: A real name is scored as "suspicious" or "gibberish"

**Most likely cause:** The name is not in the bloom filter name list for the selected locale.

**How to check:**

```ts
const result = detector.detect('Siobhan', { fieldType: 'name' });
const token = result.tokens[0];
const nameListResult = token?.scorers.find(s => s.name === 'name_list');
console.log(nameListResult);
// If found: false -> the name is not in the locale's bloom filter
```

**Solutions:**

1. **Add the name to your corpus and rebuild models:**
   ```bash
   echo "siobhan" >> corpora/en-names.txt
   pakhad-train namelist --input corpora/en-names.txt --fpr 0.001 --output models/names.bloom
   pakhad-train markov --input corpora/en-names.txt --order 3 --output models/markov.bin
   ```

2. **Use multiple locales** so the name might match in another locale's name list:
   ```ts
   import en from '@pakhad/locale-en';
   import indiaLocales from '@pakhad/locale-in';
   const detector = create({ locales: [en, ...indiaLocales] });
   ```

3. **Raise the threshold** if your use case tolerates more leniency:
   ```ts
   detector.detect(input, { thresholds: { suspicious: 0.4, gibberish: 0.75 } });
   ```

4. **Register a custom scorer** that whitelists specific names:
   ```ts
   detector.registerScorer({
     name: 'custom_whitelist',
     defaultWeight: 0.35,
     score(token) {
       const whitelist = new Set(['siobhan', 'niamh', 'aoife']);
       if (whitelist.has(token.toLowerCase())) {
         return { score: 0, confidence: 1 };
       }
       return { score: 0, confidence: 0 };
     },
   });
   ```

### Problem: Short names (2-3 chars) are flagged

Short names like "Li", "Wu", "Xu" have very few n-grams for the Markov model to analyze, so confidence is low. The `length_anomaly` scorer also adds a small penalty for single-char tokens.

**Solution:** These should generally pass. If they don't, check that they're in the name list. For single-character inputs, the `length_anomaly` scorer gives a moderate score (0.4) with low confidence (0.3), which shouldn't push the aggregate above the threshold on its own.

---

## False Negatives (gibberish not detected)

### Problem: Pattern repetition like "abcabc" passes as clean

Pattern repetition with real letters scores lower than random gibberish because:
- "abc" contains vowels (passes `vowel_consonant`)
- It may have reasonable entropy
- The Markov model might find "abc" plausible in some locales

**Solution:** Lower the suspicious threshold:
```ts
detector.detect(input, { thresholds: { suspicious: 0.2, gibberish: 0.5 } });
```

### Problem: Very short gibberish ("xx", "zz") passes

Two-character inputs don't give most scorers enough data to form an opinion. The Markov model needs at least 3 characters (for trigrams), and keyboard walk needs 4.

**Solution:** If you need to flag very short inputs, add a custom scorer or validate minimum length at the application level before calling pakhad.

---

## Locale Issues

### Problem: "auto" locale detection picks the wrong locale

Pakhad uses Unicode script detection to select locales in "auto" mode. If all your locales use the Latin script (like the shipped English and Indian romanized locales), the script detector can't distinguish between them.

**How it works:** In this case, pakhad uses all Latin-script locales as candidates and picks the best match per token based on the name list. If a name appears in the Hindi name list, it matches Hindi; otherwise it falls back to the first locale.

**Solution:** If you know the locale, specify it:
```ts
detector.detect(input, { locale: 'in-hi' });
```

### Problem: "at least one locale must be provided" error

You called `create()` with an empty `locales` array. Every detector needs at least one locale:

```ts
// Wrong
const detector = create({ locales: [] });

// Right
import en from '@pakhad/locale-en';
const detector = create({ locales: [en] });
```

---

## Performance

### Problem: Detection is slow

Pakhad is designed for sub-millisecond performance. If you're seeing slow detection:

1. **Check how many locales you loaded.** Each locale's Markov model and bloom filter are checked for every token. 10 locales = 10x the work per token.

2. **Check input length.** Very long inputs (1000+ characters) produce many tokens.

3. **Profile with durationMs:**
   ```ts
   const result = detector.detect(input);
   console.log(`${result.durationMs}ms for ${result.tokens.length} tokens`);
   ```

**Benchmarks (on a modern laptop):**
- p50: 0.009ms
- p99: 0.039ms
- With 10 locales loaded

### Problem: Large bloom filter files

The English name list (165k names) produces a 297KB bloom filter. If bundle size matters:

1. **Use a higher FPR** for smaller files:
   ```bash
   pakhad-train namelist --input names.txt --fpr 0.01 --output names.bloom
   # 0.01 FPR = ~60% smaller than 0.001 FPR
   ```

2. **Use a smaller corpus.** Top 10k names covers most real-world inputs.

---

## Model Issues

### Problem: "invalid magic number" when loading a model

The binary file is corrupted or not a pakhad model file. Verify with:

```bash
pakhad-train info your-file.bin
```

If this fails, the file needs to be rebuilt.

### Problem: Model files don't round-trip through git

Binary model files (`.bin`, `.bloom`) must be committed in binary mode. Git should handle this automatically, but if you see corruption:

1. Add to `.gitattributes`:
   ```
   *.bin binary
   *.bloom binary
   ```

2. Or use Git LFS for large model files.

---

## FAQ

**Q: Can I use pakhad in the browser?**
A: The core detection engine works in any JavaScript environment. However, `@pakhad/locale-en` and `@pakhad/locale-in` use `node:fs` to load model files. For browser use, you'd need to load the binary models via fetch and pass the deserialized objects directly to `create()`.

**Q: Does pakhad use AI/ML/LLMs?**
A: No. Pakhad uses statistical models (character n-gram Markov chains) and heuristic scorers. No neural networks, no API calls, no dependencies beyond the standard library. Everything runs locally and synchronously.

**Q: How do I update the models without republishing the package?**
A: Load models dynamically instead of from the package:
```ts
import { create } from '@pakhad/core';
import { MarkovModel, BloomFilter } from '@pakhad/train/runtime';

// Load from your own path or URL
const markov = MarkovModel.deserialize(yourUint8Array);
const bloom = BloomFilter.deserialize(yourUint8Array);

const detector = create({
  locales: [{ id: 'en', script: 'Latin', markov, nameList: bloom, metadata: { typicalTokenLength: { min: 2, max: 15, mean: 6 } } }],
});
```

**Q: What's the difference between `namelist` and `dictionary`?**
A: They produce the same thing (a bloom filter). The distinction is semantic: `namelist` is for name lists (used by the `name_list` scorer), `dictionary` is for word lists (used for sentence-mode scoring via the optional `dictionary` field in a locale). The CLI commands are aliases.

**Q: Can I combine multiple locale packs?**
A: Yes. Pass them all to `create()`:
```ts
const detector = create({ locales: [en, hi, mr, ta, myCustomLocale] });
```
Pakhad will select the best-matching locale for each token based on script detection and name list lookups.
