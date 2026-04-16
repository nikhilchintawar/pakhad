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
- [x] `@pakhad/train` with runtime serialization
  - [x] BloomFilter (murmur3 double hashing, binary serialization)
  - [x] MarkovModel (n-gram log-probabilities, binary serialization)
- [x] `@pakhad/locale-en` with real models
  - [x] Trigram Markov model from US Census + UK ONS names
  - [x] Bloom filter name list (~370 names, 0.1% FPR)
- [x] Full test suite (121+ tests)
- [x] Documentation (README, API reference, locale guide, scorer reference)
- [x] CI workflow (lint + typecheck + test)
- [x] Changesets for versioning

## v0.2.0

- [ ] `@pakhad/train` CLI
  - [ ] `pakhad-train markov` command
  - [ ] `pakhad-train namelist` command
  - [ ] `pakhad-train dictionary` command
- [ ] Expand `@pakhad/locale-en` corpus
  - [ ] Full US Census name lists (90,000+ names)
  - [ ] UK ONS complete baby name data
  - [ ] Common international names used in English contexts
- [ ] Property-based tests with fast-check for tokenizer
- [ ] Benchmark suite (`@pakhad/benchmark`)
  - [ ] Test set: 1000+ real names + 1000+ gibberish strings
  - [ ] Comparison vs nostril, gibberish-detector
  - [ ] Precision/recall/F1 per locale per scorer
  - [ ] Latency benchmark (target: p99 < 1ms)

## v0.3.0

- [ ] `@pakhad/locale-in` — Indian language locales
  - [ ] Hindi (Devanagari script, dictionary-only in v1)
  - [ ] Marathi (Devanagari script)
  - [ ] Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Punjabi
  - [ ] Individual exports + default array
- [ ] Script detection improvements
- [ ] Devanagari tokenization rules

## v1.0.0

- [ ] Devanagari Markov models (real n-gram training for Indic scripts)
- [ ] Full training pipeline with corpus management
- [ ] Comprehensive benchmark results in README
- [ ] Stable API (no breaking changes after v1.0)
- [ ] Published to npm

## Future (post v1.0)

- [ ] Additional locale packs (Spanish, French, German, Arabic, CJK)
- [ ] Browser-optimized build (WebAssembly bloom filter?)
- [ ] Streaming API for real-time validation
- [ ] Batch/cluster detection across multiple inputs
- [ ] Web playground / demo site
- [ ] VS Code extension for form validation
