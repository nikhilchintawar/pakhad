# Roadmap

## v1.0.0 (current) — Shipped

- [x] Monorepo: `@pakhad/core`, `@pakhad/train`, `@pakhad/locale-en`, `@pakhad/locale-in`, `@pakhad/default`
- [x] Full detection pipeline: tokenizer, field-type inference, 8 scorers, ensemble, `create()`/`detect()` API
- [x] Binary model format (MKOV for Markov, BLOM for bloom filters) with serialization/deserialization
- [x] `pakhad-train` CLI: markov, namelist, dictionary, info commands
- [x] `@pakhad/locale-en` — 165,326 names from US Census + SSA baby names
- [x] `@pakhad/locale-in` — 9 Indian languages with 9k+ names per locale (pan-Indian corpus + curated per-language)
- [x] `@pakhad/default` — zero-config bundle (English + all Indian locales)
- [x] Comprehensive benchmark suite: 1,000 real names + 1,000 gibberish
- [x] Comparison benchmarks vs gibberish-detector and gibberish-detective
  - pakhad: 100% precision, 98.8% recall, F1 99.4%
  - gibberish-detector: 50% accuracy (flags all real names as gibberish)
  - gibberish-detective: 80.7% accuracy (15-29% false positive rate)
- [x] Property-based tests with fast-check
- [x] Full documentation (README, API, scorer reference, locale guide, CLI reference, training pipeline, troubleshooting)
- [x] CI workflow (Node 22+24, ubuntu+macos)
- [x] Published to npm

## Future (post v1.0)

- [ ] Native-script Indian language support (Devanagari tokenization + Markov models)
- [ ] Additional locale packs (Spanish, French, German, Arabic, CJK)
- [ ] Browser-optimized build (WebAssembly bloom filter?)
- [ ] Streaming API for real-time validation
- [ ] Batch/cluster detection across multiple inputs
- [ ] Web playground / demo site
