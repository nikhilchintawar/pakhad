# Roadmap

## v0.1.0 (current)

- [x] Monorepo structure (pnpm workspaces + turbo)
- [x] `@pakhad/core` with full detection pipeline
  - [x] Tokenizer with camelCase, digit/letter, delimiter splitting
  - [x] Field type auto-inference (email, username, name, sentence, address, freetext)
  - [x] 8 scorers: markov, entropy, keyboard_walk, repetition, vowel_consonant, name_list, numeric_pattern, length_anomaly
  - [x] Confidence-weighted ensemble
  - [x] `create()` and `detect()` API
  - [x] Custom scorer registration
- [x] `@pakhad/train` with runtime serialization + CLI
  - [x] BloomFilter (murmur3 double hashing, binary serialization)
  - [x] MarkovModel (n-gram log-probabilities, binary serialization)
  - [x] `pakhad-train` CLI: markov, namelist, dictionary, info commands
- [x] `@pakhad/locale-en` with full US Census + SSA corpus
  - [x] Trigram Markov model (8,650 trigrams from 165k names)
  - [x] Bloom filter name list (165,326 names, 0.1% FPR)
- [x] `@pakhad/locale-in` — 9 Indian language locales
  - [x] Hindi, Marathi, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Punjabi
  - [x] Romanized Latin-script Markov models + name lists
  - [x] Individual exports (`hi`, `mr`, `ta`, etc.) + default array
- [x] `@pakhad/benchmark` suite
  - [x] Precision/recall/F1 (100% precision, 89.8% recall, F1 94.6%)
  - [x] Latency benchmarks (p99 0.039ms)
  - [x] Scorer contribution analysis
  - [x] False positive regression tests
- [x] 148 tests (unit + property-based with fast-check)
- [x] Full documentation (README, API ref, locale guide, scorer ref, CLI ref, getting started, training pipeline, troubleshooting)
- [x] CI workflow (lint + typecheck + test on Node 20+22, ubuntu+macos)
- [x] Changesets for versioning

## v1.0.0

- [ ] Expand Indian locale corpora (larger name databases)
- [ ] Devanagari-script tokenization rules
- [ ] Devanagari Markov models (real n-gram training for Indic scripts)
- [ ] Expand benchmark test set (1000+ real names + 1000+ gibberish)
- [ ] Comparison benchmarks vs nostril, gibberish-detector
- [ ] Comprehensive benchmark results table in README
- [ ] Stable API (no breaking changes after v1.0)
- [ ] Published to npm

## Future (post v1.0)

- [ ] Additional locale packs (Spanish, French, German, Arabic, CJK)
- [ ] Browser-optimized build (WebAssembly bloom filter?)
- [ ] Streaming API for real-time validation
- [ ] Batch/cluster detection across multiple inputs
- [ ] Web playground / demo site
- [ ] VS Code extension for form validation
