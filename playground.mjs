import { create } from './packages/core/dist/index.js';
import en from './packages/locale-en/dist/index.js';

const detector = create({ locales: [en] });

console.log('\n=== Real Names (should be clean) ===');
for (const name of ['John Smith', 'Sarah Johnson', 'Michael David', 'Jessica Williams', 'Robert Brown']) {
  const r = detector.detect(name, { fieldType: 'name' });
  console.log(`  "${name}" -> ${r.label} (score: ${r.score.toFixed(3)})`);
}

console.log('\n=== Gibberish (should be suspicious/gibberish) ===');
for (const gibberish of ['asdfgh jkl', 'qwerty uiop', 'xkqzvb wwwxxx', 'aaaa bbbb', 'zxcvbn mnbvcx']) {
  const r = detector.detect(gibberish, { fieldType: 'name' });
  console.log(`  "${gibberish}" -> ${r.label} (score: ${r.score.toFixed(3)})`);
}

console.log('\n=== Field Type Inference ===');
for (const input of ['user@example.com', 'cool_user123', 'John Doe', 'the quick brown fox jumps', '123 Main Street']) {
  const r = detector.detect(input);
  console.log(`  "${input}" -> inferred: ${r.fieldType.inferred}`);
}

console.log('\n=== Detailed Token Breakdown ===');
const detailed = detector.detect('rahul xyzqwe', { fieldType: 'name' });
console.log(`  Input: "rahul xyzqwe" -> ${detailed.label} (score: ${detailed.score.toFixed(3)})`);
for (const token of detailed.tokens) {
  console.log(`  Token "${token.text}" -> ${token.label} (score: ${token.score.toFixed(3)})`);
  for (const s of token.scorers) {
    console.log(`    ${s.name}: score=${s.score.toFixed(3)}, confidence=${s.confidence.toFixed(3)}, weight=${s.weight}`);
  }
}

console.log(`\n  Duration: ${detailed.durationMs.toFixed(2)}ms`);
console.log(`  Version: ${detailed.version}`);
