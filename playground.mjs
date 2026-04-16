/**
 * Pakhad Playground — exercises every public API.
 * Run with: node playground.mjs
 */
import {
  create,
  tokenize,
  inferFieldType,
  VERSION,
  defaultScorers,
  entropyScorer,
  keyboardWalkScorer,
  repetitionScorer,
  vowelConsonantScorer,
  nameListScorer,
  markovScorer,
  numericPatternScorer,
  lengthAnomalyScorer,
} from './packages/core/dist/index.js';
import en from './packages/locale-en/dist/index.js';
import indiaLocales, { hi, mr } from './packages/locale-in/dist/index.js';
import { BloomFilter, MarkovModel } from './packages/train/dist/runtime.js';

const SEP = '='.repeat(60);
const line = (label, value) => console.log(`  ${label.padEnd(25)} ${value}`);

// ─────────────────────────────────────────────────────────────
// 1. create() — stateful detector with locales
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  1. create() — detector with English + Indian locales');
console.log(SEP);

const detector = create({
  locales: [en, ...indiaLocales],
  defaults: { fieldType: undefined, locale: 'auto' },
});
console.log(`  Created detector with ${1 + indiaLocales.length} locales`);
console.log(`  Version: ${VERSION}`);

// ─────────────────────────────────────────────────────────────
// 2. detect() — core detection API
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  2. detect() — real names vs gibberish');
console.log(SEP);

console.log('\n  Real names:');
for (const name of ['John Smith', 'Rahul Sharma', 'Sachin Patil', 'Priya Patel', 'Siobhan Murphy']) {
  const r = detector.detect(name, { fieldType: 'name' });
  line(name, `${r.label} (${r.score.toFixed(3)})`);
}

console.log('\n  Gibberish:');
for (const g of ['asdfgh jkl', 'xkqzvb wwwxxx', 'aaaa bbbb', 'qwerty uiop', '123456 99999']) {
  const r = detector.detect(g, { fieldType: 'name' });
  line(g, `${r.label} (${r.score.toFixed(3)})`);
}

// ─────────────────────────────────────────────────────────────
// 3. detect() with all DetectOptions
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  3. DetectOptions — fieldType, locale, thresholds, scorers');
console.log(SEP);

// fieldType
console.log('\n  fieldType override:');
const r1 = detector.detect('user@example.com', { fieldType: 'email' });
line('email fieldType', `provided=${r1.fieldType.provided}, inferred=${r1.fieldType.inferred}`);

// locale override
console.log('\n  locale override (force Hindi):');
const r2 = detector.detect('rahul sharma', { locale: 'in-hi' });
line('locale mode', String(r2.locale.mode));
line('candidates', r2.locale.candidates.join(', '));

// locale array
console.log('\n  locale array (Hindi + Marathi):');
const r3 = detector.detect('sachin patil', { locale: ['in-hi', 'in-mr'] });
line('candidates', r3.locale.candidates.join(', '));

// custom thresholds
console.log('\n  custom thresholds:');
const r4 = detector.detect('asdfgh', { thresholds: { suspicious: 0.1, gibberish: 0.3 } });
line('with low thresholds', `${r4.label} (${r4.score.toFixed(3)})`);
const r5 = detector.detect('asdfgh', { thresholds: { suspicious: 0.9, gibberish: 0.95 } });
line('with high thresholds', `${r5.label} (${r5.score.toFixed(3)})`);

// scorer overrides
console.log('\n  scorer overrides:');
const r6 = detector.detect('asdfgh', {
  scorers: { keyboard_walk: { enabled: false } },
});
line('keyboard_walk disabled', `${r6.label} (${r6.score.toFixed(3)})`);

const r7 = detector.detect('asdfgh', {
  scorers: { markov: { weight: 0.9 } },
});
line('markov weight=0.9', `${r7.label} (${r7.score.toFixed(3)})`);

// ─────────────────────────────────────────────────────────────
// 4. DetectResult — full shape inspection
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  4. DetectResult — full result shape');
console.log(SEP);

const result = detector.detect('rahul xyzqwe', { fieldType: 'name' });
line('score', result.score.toFixed(3));
line('label', result.label);
line('fieldType.provided', String(result.fieldType.provided));
line('fieldType.inferred', result.fieldType.inferred);
line('locale.mode', String(result.locale.mode));
line('locale.script', result.locale.script);
line('locale.candidates', result.locale.candidates.join(', '));
line('locale.matched', JSON.stringify(result.locale.matched));
line('warnings', result.warnings.length ? result.warnings.join(', ') : '(none)');
line('durationMs', result.durationMs.toFixed(3));
line('version', result.version);

console.log('\n  Per-token breakdown:');
for (const token of result.tokens) {
  console.log(`\n    Token: "${token.text}" -> ${token.label} (${token.score.toFixed(3)}) [locale: ${token.matchedLocale}]`);
  for (const s of token.scorers) {
    console.log(`      ${s.name.padEnd(18)} score=${s.score.toFixed(3)} confidence=${s.confidence.toFixed(3)} weight=${s.weight}`);
    if (s.details) {
      const detailStr = JSON.stringify(s.details);
      if (detailStr.length < 100) console.log(`        details: ${detailStr}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Field type mismatch warning
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  5. Warnings — field_type_mismatch');
console.log(SEP);

const r8 = detector.detect('John Smith', { fieldType: 'email' });
line('input', 'John Smith');
line('provided fieldType', String(r8.fieldType.provided));
line('inferred fieldType', r8.fieldType.inferred);
line('warnings', r8.warnings.join(', '));

// ─────────────────────────────────────────────────────────────
// 6. tokenize() — standalone tokenizer
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  6. tokenize() — standalone tokenizer');
console.log(SEP);

const cases = [
  'CamelCase',
  'XMLParser',
  'user@example.com',
  'rahul123',
  'first_last-name',
  'getHTTPSUrl',
];
for (const input of cases) {
  const tokens = tokenize(input);
  const parts = tokens.map(t => `"${t.text}"[${t.start}:${t.end}]`).join(', ');
  line(input, parts);
}

// ─────────────────────────────────────────────────────────────
// 7. inferFieldType() — standalone field type inference
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  7. inferFieldType() — standalone');
console.log(SEP);

const fieldCases = [
  'user@example.com',
  'cool_user123',
  'John Doe',
  'the quick brown fox jumps',
  '123 Main Street',
  'xkqzvb',
];
for (const input of fieldCases) {
  const tokens = tokenize(input);
  const ft = inferFieldType(input, tokens);
  line(input, ft);
}

// ─────────────────────────────────────────────────────────────
// 8. registerScorer() — custom scorer
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  8. registerScorer() — custom scorer');
console.log(SEP);

const customDetector = create({ locales: [en] });

// Register a custom scorer that flags tokens containing "test"
customDetector.registerScorer({
  name: 'test_flag',
  defaultWeight: 0.5,
  score(token) {
    if (token.toLowerCase().includes('test')) {
      return { score: 0.9, confidence: 1.0, details: { reason: 'contains "test"' } };
    }
    return { score: 0, confidence: 0 };
  },
});

const r9 = customDetector.detect('testuser', { fieldType: 'username' });
line('input', 'testuser');
line('label', r9.label);
const customScorer = r9.tokens[0]?.scorers.find(s => s.name === 'test_flag');
line('custom scorer fired', customScorer ? `score=${customScorer.score}, confidence=${customScorer.confidence}` : 'no');

const r10 = customDetector.detect('John Smith', { fieldType: 'name' });
line('input', 'John Smith');
line('label', r10.label);
const customScorer2 = r10.tokens[0]?.scorers.find(s => s.name === 'test_flag');
line('custom scorer fired', customScorer2 ? 'yes' : 'no (silent, confidence 0)');

// ─────────────────────────────────────────────────────────────
// 9. Individual scorers — direct usage
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  9. Individual scorers — direct usage');
console.log(SEP);

console.log(`\n  ${defaultScorers.length} default scorers: ${defaultScorers.map(s => s.name).join(', ')}`);

const dummyCtx = {
  fieldType: 'name',
  locale: en,
  allTokens: ['asdfgh'],
  tokenIndex: 0,
};

const scorerTests = [
  { scorer: markovScorer, token: 'xkqzvb', label: 'markov (gibberish token)' },
  { scorer: markovScorer, token: 'john', label: 'markov (real name)' },
  { scorer: entropyScorer, token: 'aaaa', label: 'entropy (repetitive)' },
  { scorer: keyboardWalkScorer, token: 'asdfgh', label: 'keyboard_walk' },
  { scorer: repetitionScorer, token: 'abcabc', label: 'repetition (pattern)' },
  { scorer: vowelConsonantScorer, token: 'bcdfgh', label: 'vowel_consonant (no vowels)' },
  { scorer: nameListScorer, token: 'john', label: 'name_list (known name)' },
  { scorer: nameListScorer, token: 'xkqzvb', label: 'name_list (unknown)' },
  { scorer: numericPatternScorer, token: '123456', label: 'numeric_pattern (sequential)' },
  { scorer: numericPatternScorer, token: '1987', label: 'numeric_pattern (year)' },
  { scorer: lengthAnomalyScorer, token: 'x', label: 'length_anomaly (too short)' },
];

for (const { scorer, token, label } of scorerTests) {
  const r = scorer.score(token, dummyCtx);
  line(label, `score=${r.score.toFixed(3)} conf=${r.confidence.toFixed(3)}`);
}

// ─────────────────────────────────────────────────────────────
// 10. @pakhad/locale-in — individual locale imports
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  10. @pakhad/locale-in — individual + spread import');
console.log(SEP);

line('hi.id', hi.id);
line('hi.script', hi.script);
line('hi.markov.size', `${hi.markov.size} trigrams`);
line('hi.nameList items', `${hi.nameList.getItemCount()} names`);
line('mr.id', mr.id);
line('indiaLocales count', `${indiaLocales.length} locales`);
line('all locale IDs', indiaLocales.map(l => l.id).join(', '));

// Test Hindi-only detector
const hiDetector = create({ locales: [hi] });
const hiResult = hiDetector.detect('rahul sharma', { fieldType: 'name' });
line('Hindi detect "rahul sharma"', `${hiResult.label} (${hiResult.score.toFixed(3)})`);

// ─────────────────────────────────────────────────────────────
// 11. @pakhad/train/runtime — BloomFilter + MarkovModel
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  11. @pakhad/train/runtime — BloomFilter + MarkovModel');
console.log(SEP);

// BloomFilter API
console.log('\n  BloomFilter:');
const bf = BloomFilter.create(1000, 0.001);
bf.add('hello');
bf.add('world');
line('has("hello")', String(bf.has('hello')));
line('has("missing")', String(bf.has('missing')));
line('numBits', String(bf.numBits));
line('numHashes', String(bf.numHashes));
line('itemCount', String(bf.getItemCount()));
line('estimated FPR', `${(bf.estimatedFalsePositiveRate() * 100).toFixed(4)}%`);

// Serialize round-trip
const serialized = bf.serialize();
const restored = BloomFilter.deserialize(serialized);
line('serialize size', `${serialized.length} bytes`);
line('round-trip has("hello")', String(restored.has('hello')));

// BloomFilter.fromItems
const bf2 = BloomFilter.fromItems(['alpha', 'beta', 'gamma'], 0.01);
line('fromItems(3)', `has("alpha")=${bf2.has('alpha')}, has("delta")=${bf2.has('delta')}`);

// BloomFilter.optimalConfig
const config = BloomFilter.optimalConfig(10000, 0.001);
line('optimalConfig(10k, 0.1%)', `bits=${config.numBits}, hashes=${config.numHashes}`);

// MarkovModel API
console.log('\n  MarkovModel:');
const corpus = ['john', 'james', 'jennifer', 'joseph', 'jessica', 'michael', 'matthew', 'maria'];
const model = MarkovModel.train(corpus, 3);
line('train(8 names, order=3)', `${model.size} trigrams`);
line('scoreToken("john")', `score=${model.scoreToken('john').score.toFixed(3)}`);
line('scoreToken("xkqzvb")', `score=${model.scoreToken('xkqzvb').score.toFixed(3)}`);
line('getLogProb("joh")', model.getLogProb('joh').toFixed(3));

// Serialize round-trip
const mSerialized = model.serialize();
const mRestored = MarkovModel.deserialize(mSerialized);
line('serialize size', `${mSerialized.length} bytes`);
line('round-trip score("john")', `${mRestored.scoreToken('john').score.toFixed(3)}`);

// ─────────────────────────────────────────────────────────────
// 12. Edge cases
// ─────────────────────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  12. Edge cases');
console.log(SEP);

const edgeCases = [
  { input: '', label: 'empty string' },
  { input: '   ', label: 'whitespace only' },
  { input: 'a', label: 'single char' },
  { input: 'a'.repeat(100), label: '100x "a"' },
  { input: '!@#$%^&*()', label: 'special chars only' },
  { input: '12345', label: 'digits only' },
];

for (const { input, label } of edgeCases) {
  const r = detector.detect(input);
  line(label, `${r.label} (${r.score.toFixed(3)}) tokens=${r.tokens.length}`);
}

console.log(`\n${SEP}`);
console.log('  PLAYGROUND COMPLETE — all APIs exercised');
console.log(SEP);
