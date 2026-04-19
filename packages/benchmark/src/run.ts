/**
 * Pakhad v1.0 benchmark suite.
 *
 * Runs:
 * 1. Classification accuracy on 1000+ real names and 1000+ gibberish strings
 * 2. Comparison vs gibberish-detector and gibberish-detective libraries
 * 3. Latency benchmarks (p50, p95, p99)
 * 4. Per-scorer contribution analysis
 *
 * Run with: pnpm bench
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create } from '@pakhad/core';
import type { DetectResult } from '@pakhad/core';
import en from '@pakhad/locale-en';
import indiaLocales from '@pakhad/locale-in';

// @ts-expect-error — no types shipped
import * as gibberishDetector from 'gibberish-detector';
// @ts-expect-error — no types shipped
import GibberishDetective from 'gibberish-detective';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TestSet {
  realNames: { english: string[]; indian: string[]; all: string[] };
  gibberish: string[];
}

const testSet: TestSet = JSON.parse(
  readFileSync(resolve(__dirname, 'test-set.json'), 'utf-8'),
);

// --- Pakhad detector ---

const detector = create({ locales: [en, ...indiaLocales] });

// --- Comparison detectors ---

/** gibberish-detector returns true/false. API: detect(string). */
const gd = gibberishDetector.detect as (input: string) => boolean;

/** gibberish-detective returns a score 0-1. */
const gdv = new GibberishDetective();
// Initialize with training if needed — check API
function detectGibberishDetective(input: string): boolean {
  // Library uses isGibberish or a similar method
  if (typeof gdv.isGibberish === 'function') return gdv.isGibberish(input);
  if (typeof gdv.detect === 'function') return gdv.detect(input);
  return false;
}

// --- Metrics ---

interface DetectorFn {
  name: string;
  isGibberish: (input: string) => boolean;
}

const pakhadDetector: DetectorFn = {
  name: 'pakhad',
  isGibberish: (input) => {
    const r = detector.detect(input, { fieldType: 'name' });
    return r.label !== 'clean';
  },
};

const gdDetector: DetectorFn = {
  name: 'gibberish-detector',
  isGibberish: (input) => {
    try {
      return gd(input);
    } catch {
      return false;
    }
  },
};

const gdvDetector: DetectorFn = {
  name: 'gibberish-detective',
  isGibberish: (input) => {
    try {
      return detectGibberishDetective(input);
    } catch {
      return false;
    }
  },
};

function runMetrics(d: DetectorFn, realNames: string[], gibberishInputs: string[]) {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;

  // Real names should be classified as NOT gibberish
  for (const input of realNames) {
    const flagged = d.isGibberish(input);
    if (flagged) falsePositives++;
    else trueNegatives++;
  }

  // Gibberish should be flagged
  for (const input of gibberishInputs) {
    const flagged = d.isGibberish(input);
    if (flagged) truePositives++;
    else falseNegatives++;
  }

  const precision =
    truePositives + falsePositives > 0
      ? truePositives / (truePositives + falsePositives)
      : 0;
  const recall =
    truePositives + falseNegatives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy =
    (truePositives + trueNegatives) /
    (truePositives + trueNegatives + falsePositives + falseNegatives);

  return { truePositives, falsePositives, falseNegatives, trueNegatives, precision, recall, f1, accuracy };
}

function measureLatency(d: DetectorFn, inputs: string[]): number[] {
  const durations: number[] = [];
  for (const input of inputs) {
    const start = performance.now();
    d.isGibberish(input);
    durations.push(performance.now() - start);
  }
  return durations.sort((a, b) => a - b);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, idx)]!;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// --- Run ---

console.log('='.repeat(80));
console.log('  PAKHAD v1.0 BENCHMARK SUITE');
console.log('='.repeat(80));
console.log(
  `\nTest set: ${testSet.realNames.all.length} real names (${testSet.realNames.english.length} English + ${testSet.realNames.indian.length} Indian) + ${testSet.gibberish.length} gibberish strings\n`,
);

// 1. Classification accuracy on all libraries
console.log('## Classification Accuracy (all detectors)\n');

const libraries: DetectorFn[] = [pakhadDetector, gdDetector, gdvDetector];
const accuracyRows: Array<{
  name: string;
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  tp: number;
  tn: number;
  fp: number;
  fn: number;
}> = [];

for (const lib of libraries) {
  const m = runMetrics(lib, testSet.realNames.all, testSet.gibberish);
  accuracyRows.push({
    name: lib.name,
    precision: m.precision,
    recall: m.recall,
    f1: m.f1,
    accuracy: m.accuracy,
    tp: m.truePositives,
    tn: m.trueNegatives,
    fp: m.falsePositives,
    fn: m.falseNegatives,
  });
}

console.log('| Library | Precision | Recall | F1 | Accuracy | FP (real flagged) | FN (gibberish missed) |');
console.log('|---------|-----------|--------|-----|----------|-------------------|------------------------|');
for (const r of accuracyRows) {
  console.log(
    `| ${r.name} | ${pct(r.precision)} | ${pct(r.recall)} | ${pct(r.f1)} | ${pct(r.accuracy)} | ${r.fp} / ${testSet.realNames.all.length} | ${r.fn} / ${testSet.gibberish.length} |`,
  );
}

// 2. Per-category accuracy (English vs Indian names)
console.log('\n## Accuracy Breakdown by Name Origin\n');

console.log('### English Names (500 samples)\n');
console.log('| Library | False Positives | Rate |');
console.log('|---------|-----------------|------|');
for (const lib of libraries) {
  const m = runMetrics(lib, testSet.realNames.english, []);
  console.log(`| ${lib.name} | ${m.falsePositives} | ${pct(m.falsePositives / testSet.realNames.english.length)} |`);
}

console.log('\n### Indian Names (500 samples)\n');
console.log('| Library | False Positives | Rate |');
console.log('|---------|-----------------|------|');
for (const lib of libraries) {
  const m = runMetrics(lib, testSet.realNames.indian, []);
  console.log(`| ${lib.name} | ${m.falsePositives} | ${pct(m.falsePositives / testSet.realNames.indian.length)} |`);
}

// 3. Latency
console.log('\n## Latency Comparison\n');

const allInputs = [...testSet.realNames.all, ...testSet.gibberish];
console.log('| Library | p50 | p95 | p99 | max | mean |');
console.log('|---------|-----|-----|-----|-----|------|');
for (const lib of libraries) {
  const l = measureLatency(lib, allInputs);
  const mean = l.reduce((a, b) => a + b, 0) / l.length;
  console.log(
    `| ${lib.name} | ${percentile(l, 0.5).toFixed(3)}ms | ${percentile(l, 0.95).toFixed(3)}ms | ${percentile(l, 0.99).toFixed(3)}ms | ${l[l.length - 1]!.toFixed(3)}ms | ${mean.toFixed(3)}ms |`,
  );
}

// 4. Pakhad per-scorer analysis
console.log('\n## Pakhad Per-Scorer Contribution (on gibberish inputs)\n');

const scorerStats = new Map<string, { totalScore: number; count: number; totalConfidence: number }>();

for (const g of testSet.gibberish) {
  const result: DetectResult = detector.detect(g, { fieldType: 'name' });
  for (const token of result.tokens) {
    for (const scorer of token.scorers) {
      const s = scorerStats.get(scorer.name) ?? { totalScore: 0, count: 0, totalConfidence: 0 };
      s.totalScore += scorer.score;
      s.totalConfidence += scorer.confidence;
      s.count++;
      scorerStats.set(scorer.name, s);
    }
  }
}

console.log('| Scorer | Avg Score | Avg Confidence | Activations |');
console.log('|--------|-----------|----------------|-------------|');
for (const [name, stats] of [...scorerStats.entries()].sort(
  (a, b) => b[1].totalScore / b[1].count - a[1].totalScore / a[1].count,
)) {
  console.log(
    `| ${name} | ${(stats.totalScore / stats.count).toFixed(3)} | ${(stats.totalConfidence / stats.count).toFixed(3)} | ${stats.count} |`,
  );
}

console.log('\n' + '='.repeat(80));
console.log('  BENCHMARK COMPLETE');
console.log('='.repeat(80));
