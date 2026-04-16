/**
 * Pakhad benchmark suite.
 *
 * Measures:
 * 1. Precision/Recall/F1 for gibberish detection
 * 2. False positive rate on known-tricky names
 * 3. Latency (p50, p95, p99)
 * 4. Per-scorer contribution analysis
 *
 * Run with: pnpm bench
 */
import { create } from '@pakhad/core';
import type { DetectResult } from '@pakhad/core';
import en from '@pakhad/locale-en';
import indiaLocales from '@pakhad/locale-in';
import { REAL_NAMES, GIBBERISH_STRINGS, FALSE_POSITIVE_REGRESSION } from './test-data.js';

// Create detector with all locales
const detector = create({ locales: [en, ...indiaLocales] });

// --- Precision / Recall / F1 ---

interface ClassificationResult {
  input: string;
  expected: 'clean' | 'gibberish';
  actual: DetectResult;
  correct: boolean;
}

function classify(
  inputs: string[],
  expected: 'clean' | 'gibberish',
): ClassificationResult[] {
  return inputs.map((input) => {
    const result = detector.detect(input, { fieldType: 'name' });
    const isClean = result.label === 'clean';
    const correct =
      expected === 'clean' ? isClean : !isClean;
    return { input, expected, actual: result, correct };
  });
}

function computeMetrics(results: ClassificationResult[]) {
  const truePositives = results.filter(
    (r) => r.expected === 'gibberish' && !r.correct === false && r.actual.label !== 'clean',
  ).length;
  const falsePositives = results.filter(
    (r) => r.expected === 'clean' && r.actual.label !== 'clean',
  ).length;
  const falseNegatives = results.filter(
    (r) => r.expected === 'gibberish' && r.actual.label === 'clean',
  ).length;
  const trueNegatives = results.filter(
    (r) => r.expected === 'clean' && r.actual.label === 'clean',
  ).length;

  const precision =
    truePositives + falsePositives > 0
      ? truePositives / (truePositives + falsePositives)
      : 0;
  const recall =
    truePositives + falseNegatives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;
  const f1 =
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { truePositives, falsePositives, falseNegatives, trueNegatives, precision, recall, f1 };
}

// --- Latency ---

function measureLatency(inputs: string[], iterations: number = 3): number[] {
  const durations: number[] = [];
  for (let iter = 0; iter < iterations; iter++) {
    for (const input of inputs) {
      const start = performance.now();
      detector.detect(input, { fieldType: 'name' });
      durations.push(performance.now() - start);
    }
  }
  return durations.sort((a, b) => a - b);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, idx)]!;
}

// --- Run benchmarks ---

console.log('='.repeat(70));
console.log('  PAKHAD BENCHMARK SUITE');
console.log('='.repeat(70));

// 1. Classification accuracy
console.log('\n## Classification Accuracy\n');

const cleanResults = classify(REAL_NAMES, 'clean');
const gibberishResults = classify(GIBBERISH_STRINGS, 'gibberish');
const allResults = [...cleanResults, ...gibberishResults];
const metrics = computeMetrics(allResults);

console.log(`| Metric | Value |`);
console.log(`|--------|-------|`);
console.log(`| True Positives (gibberish correctly detected) | ${metrics.truePositives} |`);
console.log(`| True Negatives (clean correctly passed) | ${metrics.trueNegatives} |`);
console.log(`| False Positives (clean incorrectly flagged) | ${metrics.falsePositives} |`);
console.log(`| False Negatives (gibberish incorrectly passed) | ${metrics.falseNegatives} |`);
console.log(`| **Precision** | **${(metrics.precision * 100).toFixed(1)}%** |`);
console.log(`| **Recall** | **${(metrics.recall * 100).toFixed(1)}%** |`);
console.log(`| **F1 Score** | **${(metrics.f1 * 100).toFixed(1)}%** |`);

// Show misclassified
const misclassified = allResults.filter((r) => !r.correct);
if (misclassified.length > 0) {
  console.log(`\n### Misclassified (${misclassified.length}):\n`);
  for (const m of misclassified) {
    console.log(
      `  "${m.input}" — expected: ${m.expected}, got: ${m.actual.label} (score: ${m.actual.score.toFixed(3)})`,
    );
  }
}

// 2. False positive regression
console.log('\n## False Positive Regression (tricky names)\n');

const regressionResults = classify(FALSE_POSITIVE_REGRESSION, 'clean');
const falsePositives = regressionResults.filter((r) => !r.correct);

console.log(
  `${regressionResults.length - falsePositives.length}/${regressionResults.length} tricky names correctly classified as clean`,
);

if (falsePositives.length > 0) {
  console.log('\nFalse positives:');
  for (const fp of falsePositives) {
    console.log(
      `  "${fp.input}" -> ${fp.actual.label} (score: ${fp.actual.score.toFixed(3)})`,
    );
  }
}

// 3. Latency
console.log('\n## Latency\n');

const allInputs = [...REAL_NAMES, ...GIBBERISH_STRINGS];
const latencies = measureLatency(allInputs, 5);

console.log(`| Percentile | Latency |`);
console.log(`|------------|---------|`);
console.log(`| p50 | ${percentile(latencies, 0.5).toFixed(3)}ms |`);
console.log(`| p90 | ${percentile(latencies, 0.9).toFixed(3)}ms |`);
console.log(`| p95 | ${percentile(latencies, 0.95).toFixed(3)}ms |`);
console.log(`| p99 | ${percentile(latencies, 0.99).toFixed(3)}ms |`);
console.log(`| max | ${latencies[latencies.length - 1]!.toFixed(3)}ms |`);
console.log(`| mean | ${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(3)}ms |`);
console.log(`| total inputs | ${allInputs.length} x 5 iterations = ${latencies.length} |`);

// 4. Per-scorer analysis
console.log('\n## Scorer Contribution Analysis\n');

console.log('Average scorer impact on gibberish detection:');
const scorerStats = new Map<string, { totalScore: number; count: number; totalConfidence: number }>();

for (const g of GIBBERISH_STRINGS) {
  const result = detector.detect(g, { fieldType: 'name' });
  for (const token of result.tokens) {
    for (const scorer of token.scorers) {
      const stats = scorerStats.get(scorer.name) ?? {
        totalScore: 0,
        count: 0,
        totalConfidence: 0,
      };
      stats.totalScore += scorer.score;
      stats.totalConfidence += scorer.confidence;
      stats.count++;
      scorerStats.set(scorer.name, stats);
    }
  }
}

console.log(`\n| Scorer | Avg Score | Avg Confidence | Activations |`);
console.log(`|--------|-----------|----------------|-------------|`);
for (const [name, stats] of [...scorerStats.entries()].sort(
  (a, b) => b[1].totalScore / b[1].count - a[1].totalScore / a[1].count,
)) {
  console.log(
    `| ${name} | ${(stats.totalScore / stats.count).toFixed(3)} | ${(stats.totalConfidence / stats.count).toFixed(3)} | ${stats.count} |`,
  );
}

console.log('\n' + '='.repeat(70));
console.log('  BENCHMARK COMPLETE');
console.log('='.repeat(70));
