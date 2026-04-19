/**
 * Generate a large, reproducible benchmark test set.
 *
 * Outputs test-set.json with:
 * - 500 real English names (sampled from corpora/en-names.txt)
 * - 500 real Indian names (sampled from corpora/in-names.txt)
 * - 1000 gibberish strings across multiple categories
 *
 * Uses a seeded random so the test set is stable across runs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const corporaDir = resolve(__dirname, '../../../corpora');
const outputPath = resolve(__dirname, 'test-set.json');

// Simple seeded PRNG for reproducibility (mulberry32)
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

function sample<T>(arr: T[], n: number): T[] {
  const indices = new Set<number>();
  while (indices.size < n && indices.size < arr.length) {
    indices.add(Math.floor(rand() * arr.length));
  }
  return [...indices].map((i) => arr[i]!);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Load corpora ---

const enNames = readFileSync(resolve(corporaDir, 'en-names.txt'), 'utf-8')
  .split('\n')
  .filter((l) => l.trim().length >= 3);

const inNames = readFileSync(resolve(corporaDir, 'in-names.txt'), 'utf-8')
  .split('\n')
  .filter((l) => l.trim().length >= 3);

console.log(`Loaded ${enNames.length} English + ${inNames.length} Indian names`);

// --- Real names: combine first + last into "full name" format ---

const realEnglish: string[] = [];
const sampledEn = sample(enNames, 1000); // pick more than needed for first+last combos
for (let i = 0; i < 500; i++) {
  const first = capitalize(sampledEn[i * 2 % sampledEn.length]!);
  const last = capitalize(sampledEn[(i * 2 + 1) % sampledEn.length]!);
  realEnglish.push(`${first} ${last}`);
}

const realIndian: string[] = [];
const sampledIn = sample(inNames, 1000);
for (let i = 0; i < 500; i++) {
  const first = capitalize(sampledIn[i * 2 % sampledIn.length]!);
  const last = capitalize(sampledIn[(i * 2 + 1) % sampledIn.length]!);
  realIndian.push(`${first} ${last}`);
}

const realNames = [...realEnglish, ...realIndian];

// --- Gibberish generators ---

const CONSONANTS = 'bcdfghjklmnpqrstvwxyz';
const VOWELS = 'aeiou';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function randomChars(n: number): string {
  return Array.from({ length: n }, () => pick(LETTERS.split(''))).join('');
}

function keyboardWalk(minLen: number, maxLen: number): string {
  const row = pick(KEYBOARD_ROWS);
  const len = minLen + Math.floor(rand() * (maxLen - minLen + 1));
  const start = Math.floor(rand() * Math.max(1, row.length - len));
  return row.substring(start, start + len);
}

function repeat(): string {
  const ch = pick(LETTERS.split(''));
  const len = 4 + Math.floor(rand() * 6);
  return ch.repeat(len);
}

function patternRepeat(): string {
  const patLen = 2 + Math.floor(rand() * 3);
  const pattern = randomChars(patLen);
  const repeats = 2 + Math.floor(rand() * 3);
  return pattern.repeat(repeats);
}

function allConsonants(): string {
  const len = 4 + Math.floor(rand() * 6);
  return Array.from({ length: len }, () => pick(CONSONANTS.split(''))).join('');
}

function allVowels(): string {
  const len = 4 + Math.floor(rand() * 4);
  return Array.from({ length: len }, () => pick(VOWELS.split(''))).join('');
}

function sequentialDigits(): string {
  const start = Math.floor(rand() * 4);
  const len = 5 + Math.floor(rand() * 4);
  return Array.from({ length: len }, (_, i) => String((start + i) % 10)).join('');
}

function repeatedDigits(): string {
  const d = Math.floor(rand() * 10);
  const len = 5 + Math.floor(rand() * 4);
  return String(d).repeat(len);
}

function smashed(): string {
  // Random 6-10 char strings with typical gibberish feel
  const len = 6 + Math.floor(rand() * 5);
  return randomChars(len);
}

// Generate gibberish
const gibberish: string[] = [];

// Keyboard walks (200)
for (let i = 0; i < 200; i++) {
  if (i % 3 === 0) gibberish.push(keyboardWalk(5, 8));
  else if (i % 3 === 1) gibberish.push(`${keyboardWalk(4, 6)} ${keyboardWalk(4, 6)}`);
  else gibberish.push(capitalize(keyboardWalk(5, 8)));
}

// Repetitive (200)
for (let i = 0; i < 200; i++) {
  if (i % 3 === 0) gibberish.push(repeat());
  else if (i % 3 === 1) gibberish.push(patternRepeat());
  else gibberish.push(`${repeat()} ${patternRepeat()}`);
}

// All consonants / all vowels (100)
for (let i = 0; i < 50; i++) gibberish.push(allConsonants());
for (let i = 0; i < 50; i++) gibberish.push(allVowels());

// Smashed random (300)
for (let i = 0; i < 300; i++) {
  if (i % 2 === 0) gibberish.push(smashed());
  else gibberish.push(`${smashed()} ${smashed()}`);
}

// Numeric patterns (100)
for (let i = 0; i < 50; i++) gibberish.push(sequentialDigits());
for (let i = 0; i < 50; i++) gibberish.push(repeatedDigits());

// Mixed gibberish-looking "name" tokens (100)
for (let i = 0; i < 100; i++) {
  gibberish.push(`${capitalize(smashed())} ${capitalize(smashed())}`);
}

console.log(`Generated ${realNames.length} real + ${gibberish.length} gibberish`);

const testSet = {
  version: 1,
  seed: 42,
  realNames: {
    english: realEnglish,
    indian: realIndian,
    all: realNames,
  },
  gibberish,
  stats: {
    realCount: realNames.length,
    gibberishCount: gibberish.length,
  },
};

writeFileSync(outputPath, JSON.stringify(testSet, null, 2));
console.log(`Written test set to ${outputPath}`);
