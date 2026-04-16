# Scorer Reference

This document describes each built-in scorer in detail, including its purpose, algorithm, tuning parameters, and when it fires vs. stays silent.

## Ensemble Behavior

Scorers participate in a confidence-weighted average:

1. Each scorer returns `{ score, confidence }` for a token
2. Scorers with `confidence: 0` are **silent** (excluded from the average)
3. Each scorer's contribution = `score * confidence * weight`
4. Token score = weighted sum / total weight
5. Input score = length-weighted mean of token scores (longer tokens count more)

---

## `markov` (weight: 0.25)

**Purpose**: Detect unlikely character sequences by comparing n-gram transition probabilities against a trained language model.

**Algorithm**:
1. Extract all n-grams (default: trigrams) from the lowercased token
2. Look up each n-gram's log-probability in the locale's Markov model
3. Average the log-probabilities
4. Map the average via a sigmoid to [0, 1] where more-negative avg = higher score

**When it fires**: Token length >= model order (typically 3)

**When it's silent**: Token too short for any n-gram

**False positive risks**: Unusual but valid names from underrepresented languages. Mitigated by the name_list scorer.

---

## `entropy` (weight: 0.12)

**Purpose**: Flag tokens with abnormal character distributions.

**Algorithm**:
1. Count character frequencies in the lowercased token
2. Compute Shannon entropy: `H = -sum(p * log2(p))`
3. Normalize by maximum possible entropy for the token length
4. Flag if normalized entropy is below 0.3 (too repetitive) or above 0.98 (pathological)

**When it fires**: Extreme entropy values

**When it's silent**: Normal entropy range (most real text)

**Notes**: High entropy alone is a weak signal -- many real names have all-unique characters. The Markov model is the primary randomness detector.

---

## `keyboard_walk` (weight: 0.15)

**Purpose**: Detect QWERTY and AZERTY keyboard adjacency walks.

**Algorithm**:
1. For each consecutive character pair, check if they're adjacent on a keyboard layout
2. Calculate the ratio of adjacent pairs to total pairs
3. Ratio >= 0.5: flag as keyboard walk
4. Check both QWERTY and AZERTY, use the layout with more matches

**When it fires**: >= 50% of character pairs are keyboard-adjacent AND token length >= 4

**When it's silent**: Token too short, or low adjacency ratio

**Keyboard layouts**: QWERTY and AZERTY in v1. Additional layouts can be added via custom scorers.

---

## `repetition` (weight: 0.12)

**Purpose**: Detect run-length repetition and repeating substring patterns.

**Algorithm**:
1. **Run-length**: Find the longest run of the same character. Flag if run/length > 0.6
2. **Pattern**: Try all substring lengths 1..len/2. If a pattern repeats covering > 70% of the string, flag it.

**When it fires**: Clear repetition pattern detected

**When it's silent**: No significant repetition

**Examples**: `aaaa` (run-length), `abcabc` (pattern), `xyzxyz` (pattern)

---

## `vowel_consonant` (weight: 0.10)

**Purpose**: Flag tokens with impossible vowel/consonant ratios for Latin-script text.

**Algorithm**:
1. Count vowels (a, e, i, o, u, y) and consonants among Latin letters
2. Flag if vowel ratio < 0.1 (all consonants), > 0.9 (all vowels), or consonant cluster > 5

**When it fires**: Extreme ratio or long consonant cluster

**When it's silent**: Non-Latin characters, or normal ratio

**Note**: "y" is counted as a vowel. This scorer only analyzes Latin letters.

---

## `name_list` (weight: 0.35)

**Purpose**: Provide a strong clean signal for known names, preventing false positives.

**Algorithm**:
1. Look up the lowercased token in the locale's bloom filter
2. **Hit**: score 0.0, confidence 1.0 (definitely a known name)
3. **Miss**: score 0, confidence 0 (silent -- absence is not evidence)

**Why the highest weight**: This scorer's job is to override other scorers that might flag unusual but valid names. When `nameListScorer` says "this IS a known name," that strong clean signal pulls the ensemble score toward 0 even if other scorers flagged the character patterns.

**Key design choice**: A miss is **silent**, not penalizing. If a name isn't in the list, that's not evidence of gibberish -- it just means this scorer has no opinion.

---

## `numeric_pattern` (weight: 0.08)

**Purpose**: Analyze all-digit tokens for gibberish patterns.

**Algorithm**:
1. Only fires on all-digit tokens (mixed alphanumeric = silent)
2. Sequential digits (123456, 987654): high gibberish score
3. Repeated digits (99999): high gibberish score
4. Year-like (1987, 2024): clean signal, high confidence
5. Other numbers: low confidence (ambiguous)

**When it fires**: All-digit tokens with clear patterns

**When it's silent**: Non-numeric tokens, or ambiguous number patterns

---

## `length_anomaly` (weight: 0.05)

**Purpose**: Flag tokens that are extremely short or long.

**Algorithm**:
1. Single character: score 0.4, confidence 0.3
2. Over 30 characters: score scales with excess length
3. Normal length (2-30): silent

**When it fires**: 1 char or 30+ chars

**When it's silent**: Normal length range

**Low weight**: Length alone is a very weak signal; this scorer adds a small nudge.
