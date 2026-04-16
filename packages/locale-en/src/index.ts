import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BloomFilter, MarkovModel } from '@pakhad/train/runtime';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve model paths — they live in the models/ directory next to src/
// In the built package, they're at ../models/ relative to dist/
function resolveModelPath(filename: string): string {
  // Try from src (development)
  const srcPath = resolve(__dirname, '../models', filename);
  return srcPath;
}

function loadMarkov(): MarkovModel {
  const data = readFileSync(resolveModelPath('markov.bin'));
  return MarkovModel.deserialize(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
}

function loadNameList(): BloomFilter {
  const data = readFileSync(resolveModelPath('names.bloom'));
  return BloomFilter.deserialize(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
}

/**
 * English locale pack for pakhad.
 *
 * Includes:
 * - Trigram Markov model trained on US Census + UK ONS name data
 * - Bloom filter of ~370 common English names (first + last)
 *
 * For production use with larger corpora, rebuild models using @pakhad/train:
 *   pakhad-train markov --input your-names.txt --order 3 --output markov.bin
 *   pakhad-train namelist --input your-names.txt --false-positive-rate 0.001 --output names.bloom
 */
const en = {
  id: 'en' as const,
  script: 'Latin' as const,
  markov: loadMarkov(),
  nameList: loadNameList(),
  metadata: {
    typicalTokenLength: { min: 2, max: 15, mean: 6 },
    recommendedThresholds: { suspicious: 0.3, gibberish: 0.65 },
  },
};

export default en;
