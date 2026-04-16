#!/usr/bin/env node

/**
 * pakhad-train CLI
 *
 * Commands:
 *   pakhad-train markov --input <file> --order <n> --output <file>
 *   pakhad-train namelist --input <file> --false-positive-rate <rate> --output <file>
 *   pakhad-train dictionary --input <file> --false-positive-rate <rate> --output <file>
 *   pakhad-train info <file>   — inspect a .bin or .bloom model file
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MarkovModel } from './runtime/markov-model.js';
import { BloomFilter } from './runtime/bloom-filter.js';

interface CliArgs {
  command: string;
  input?: string;
  output?: string;
  order?: number;
  falsePositiveRate?: number;
  file?: string;
  minLength?: number;
  maxLength?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const command = args[0] ?? '';
  const result: CliArgs = { command };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!;
    const next = args[i + 1];

    switch (arg) {
      case '--input':
      case '-i':
        result.input = next;
        i++;
        break;
      case '--output':
      case '-o':
        result.output = next;
        i++;
        break;
      case '--order':
        result.order = parseInt(next ?? '3', 10);
        i++;
        break;
      case '--false-positive-rate':
      case '--fpr':
        result.falsePositiveRate = parseFloat(next ?? '0.001');
        i++;
        break;
      case '--min-length':
        result.minLength = parseInt(next ?? '2', 10);
        i++;
        break;
      case '--max-length':
        result.maxLength = parseInt(next ?? '50', 10);
        i++;
        break;
      default:
        // Positional arg for 'info' command
        if (!result.file && command === 'info') {
          result.file = arg;
        }
    }
  }

  return result;
}

function loadCorpus(
  inputPath: string,
  minLength: number = 2,
  maxLength: number = 50,
): string[] {
  const raw = readFileSync(resolve(inputPath), 'utf-8');
  const lines = raw
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('#'))
    .filter((line) => line.length >= minLength && line.length <= maxLength);

  // Deduplicate
  const unique = [...new Set(lines)];
  return unique;
}

function commandMarkov(args: CliArgs): void {
  if (!args.input) {
    console.error('Error: --input is required');
    console.error('Usage: pakhad-train markov --input <file> [--order 3] --output <file>');
    process.exit(1);
  }
  if (!args.output) {
    console.error('Error: --output is required');
    process.exit(1);
  }

  const order = args.order ?? 3;
  console.log(`Loading corpus from ${args.input}...`);
  const corpus = loadCorpus(args.input, args.minLength, args.maxLength);
  console.log(`  ${corpus.length} unique entries loaded`);

  console.log(`Training ${order}-gram Markov model...`);
  const model = MarkovModel.train(corpus, order);
  console.log(`  ${model.size} n-grams, alphabet size: ${model.alphabetSize}`);

  const binary = model.serialize();
  writeFileSync(resolve(args.output), binary);
  console.log(`  Written to ${args.output} (${binary.length} bytes)`);

  // Quick sanity check — score a few entries from the corpus
  if (corpus.length > 0) {
    console.log('\nSanity check (corpus samples):');
    const samples = corpus.slice(0, Math.min(5, corpus.length));
    for (const sample of samples) {
      const result = model.scoreToken(sample);
      console.log(`  "${sample}" -> score: ${result.score.toFixed(3)}`);
    }
    // Also test gibberish
    console.log('Sanity check (gibberish):');
    for (const g of ['xkqzvb', 'asdfgh', 'zzzzz']) {
      const result = model.scoreToken(g);
      console.log(`  "${g}" -> score: ${result.score.toFixed(3)}`);
    }
  }
}

function commandNamelist(args: CliArgs): void {
  if (!args.input) {
    console.error('Error: --input is required');
    console.error(
      'Usage: pakhad-train namelist --input <file> [--false-positive-rate 0.001] --output <file>',
    );
    process.exit(1);
  }
  if (!args.output) {
    console.error('Error: --output is required');
    process.exit(1);
  }

  const fpr = args.falsePositiveRate ?? 0.001;
  console.log(`Loading corpus from ${args.input}...`);
  const corpus = loadCorpus(args.input, args.minLength, args.maxLength);
  console.log(`  ${corpus.length} unique entries loaded`);

  console.log(`Building bloom filter (target FPR: ${(fpr * 100).toFixed(4)}%)...`);
  const bloom = BloomFilter.fromItems(corpus, fpr);
  console.log(`  ${bloom.getItemCount()} items, ${bloom.numBits} bits, ${bloom.numHashes} hashes`);
  console.log(
    `  Estimated FPR: ${(bloom.estimatedFalsePositiveRate() * 100).toFixed(4)}%`,
  );

  const binary = bloom.serialize();
  writeFileSync(resolve(args.output), binary);
  console.log(`  Written to ${args.output} (${binary.length} bytes)`);

  // Sanity check
  if (corpus.length > 0) {
    console.log('\nSanity check (corpus samples):');
    const samples = corpus.slice(0, Math.min(5, corpus.length));
    for (const sample of samples) {
      console.log(`  "${sample}" -> has: ${bloom.has(sample)}`);
    }
    console.log('Sanity check (should be false):');
    for (const g of ['xkqzvb', 'asdfgh', 'zzzzz']) {
      console.log(`  "${g}" -> has: ${bloom.has(g)}`);
    }
  }
}

function commandDictionary(args: CliArgs): void {
  // Dictionary is the same as namelist — just a bloom filter of words
  // Keeping a separate command for clarity in usage
  commandNamelist(args);
}

function commandInfo(args: CliArgs): void {
  const file = args.file;
  if (!file) {
    console.error('Error: file path required');
    console.error('Usage: pakhad-train info <file>');
    process.exit(1);
  }

  const data = readFileSync(resolve(file));
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  if (bytes.length < 4) {
    console.error('File too small to identify');
    process.exit(1);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(0, true);

  if (magic === 0x4d4b4f56) {
    // MKOV — Markov model
    const model = MarkovModel.deserialize(bytes);
    console.log('Type:           Markov model');
    console.log(`Order:          ${model.order}`);
    console.log(`N-grams:        ${model.size}`);
    console.log(`Alphabet size:  ${model.alphabetSize}`);
    console.log(`File size:      ${bytes.length} bytes`);
  } else if (magic === 0x424c4f4d) {
    // BLOM — Bloom filter
    const bloom = BloomFilter.deserialize(bytes);
    console.log('Type:           Bloom filter');
    console.log(`Bits:           ${bloom.numBits}`);
    console.log(`Hash functions: ${bloom.numHashes}`);
    console.log(`Items inserted: ${bloom.getItemCount()}`);
    console.log(
      `Estimated FPR:  ${(bloom.estimatedFalsePositiveRate() * 100).toFixed(4)}%`,
    );
    console.log(`File size:      ${bytes.length} bytes`);
  } else {
    console.error(`Unknown file format (magic: 0x${magic.toString(16)})`);
    process.exit(1);
  }
}

function printUsage(): void {
  console.log(`pakhad-train — build locale models for pakhad

Commands:
  markov      Build a character n-gram Markov model
  namelist    Build a bloom filter from a name list
  dictionary  Build a bloom filter from a word list
  info        Inspect a model file (.bin or .bloom)

Usage:
  pakhad-train markov --input <file> [--order 3] [--min-length 2] [--max-length 50] --output <file>
  pakhad-train namelist --input <file> [--fpr 0.001] [--min-length 2] [--max-length 50] --output <file>
  pakhad-train dictionary --input <file> [--fpr 0.001] --output <file>
  pakhad-train info <file>

Options:
  --input, -i             Input corpus file (one entry per line)
  --output, -o            Output binary model file
  --order                 N-gram order for Markov models (default: 3)
  --false-positive-rate   Target FPR for bloom filters (default: 0.001)
  --fpr                   Alias for --false-positive-rate
  --min-length            Minimum entry length to include (default: 2)
  --max-length            Maximum entry length to include (default: 50)

Input format:
  One entry per line, UTF-8. Lines starting with # are comments.
  Entries are lowercased and deduplicated automatically.
`);
}

function main(): void {
  const args = parseArgs(process.argv);

  switch (args.command) {
    case 'markov':
      commandMarkov(args);
      break;
    case 'namelist':
      commandNamelist(args);
      break;
    case 'dictionary':
      commandDictionary(args);
      break;
    case 'info':
      commandInfo(args);
      break;
    case '':
    case 'help':
    case '--help':
    case '-h':
      printUsage();
      break;
    default:
      console.error(`Unknown command: ${args.command}`);
      printUsage();
      process.exit(1);
  }
}

main();
