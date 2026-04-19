import { detect } from '../packages/default/dist/index.js';

console.log('\nTesting @pakhad/default:\n');

const cases = [
  'John Smith',
  'Rahul Sharma',
  'Priya Patel',
  'asdfgh qwerty',
  'xkqzvb wwwxxx',
];

for (const input of cases) {
  const r = detect(input);
  console.log(`  "${input}" -> ${r.label} (${r.score.toFixed(3)})`);
}
