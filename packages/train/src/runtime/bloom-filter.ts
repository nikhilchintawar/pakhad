import { murmur3 } from './murmur3.js';

/**
 * Bloom filter with double-hashing scheme (two murmur3 hashes combined to
 * simulate k hash functions). Supports serialization to/from Uint8Array
 * for binary model files.
 *
 * Binary format:
 *   [4 bytes] magic number 0x424C4F4D ("BLOM")
 *   [4 bytes] version (1)
 *   [4 bytes] numBits (uint32 LE)
 *   [4 bytes] numHashes (uint32 LE)
 *   [4 bytes] itemCount (uint32 LE) — informational, how many items were inserted
 *   [N bytes] bit array (ceil(numBits / 8) bytes)
 */

const MAGIC = 0x424c4f4d; // "BLOM"
const VERSION = 1;
const HEADER_SIZE = 20; // 5 x 4 bytes

export interface BloomFilterConfig {
  /** Number of bits in the filter */
  numBits: number;
  /** Number of hash functions to simulate */
  numHashes: number;
}

export class BloomFilter {
  readonly numBits: number;
  readonly numHashes: number;
  private readonly bits: Uint8Array;
  private itemCount: number;

  constructor(config: BloomFilterConfig) {
    this.numBits = config.numBits;
    this.numHashes = config.numHashes;
    this.bits = new Uint8Array(Math.ceil(this.numBits / 8));
    this.itemCount = 0;
  }

  /**
   * Calculate optimal bloom filter parameters for a given number of items
   * and desired false positive rate.
   */
  static optimalConfig(
    expectedItems: number,
    falsePositiveRate: number,
  ): BloomFilterConfig {
    const numBits = Math.ceil(
      (-expectedItems * Math.log(falsePositiveRate)) / (Math.log(2) ** 2),
    );
    const numHashes = Math.max(
      1,
      Math.round((numBits / expectedItems) * Math.log(2)),
    );
    return { numBits, numHashes };
  }

  /**
   * Create a bloom filter sized for the given parameters.
   */
  static create(
    expectedItems: number,
    falsePositiveRate: number = 0.001,
  ): BloomFilter {
    return new BloomFilter(
      BloomFilter.optimalConfig(expectedItems, falsePositiveRate),
    );
  }

  /**
   * Build a bloom filter from an iterable of strings.
   */
  static fromItems(
    items: Iterable<string>,
    falsePositiveRate: number = 0.001,
  ): BloomFilter {
    const arr = Array.isArray(items) ? items : [...items];
    const filter = BloomFilter.create(arr.length, falsePositiveRate);
    for (const item of arr) {
      filter.add(item);
    }
    return filter;
  }

  private getPositions(key: string): number[] {
    const h1 = murmur3(key, 0);
    const h2 = murmur3(key, h1);
    const positions: number[] = [];
    for (let i = 0; i < this.numHashes; i++) {
      // Double hashing: h(i) = (h1 + i * h2) mod numBits
      positions.push(((h1 + Math.imul(i, h2)) >>> 0) % this.numBits);
    }
    return positions;
  }

  add(key: string): void {
    const positions = this.getPositions(key);
    for (const pos of positions) {
      const byteIndex = pos >>> 3;
      const bitIndex = pos & 7;
      this.bits[byteIndex]! |= 1 << bitIndex;
    }
    this.itemCount++;
  }

  has(key: string): boolean {
    const positions = this.getPositions(key);
    for (const pos of positions) {
      const byteIndex = pos >>> 3;
      const bitIndex = pos & 7;
      if (((this.bits[byteIndex]! >>> bitIndex) & 1) === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Serialize to a compact binary format (Uint8Array).
   */
  serialize(): Uint8Array {
    const buffer = new Uint8Array(HEADER_SIZE + this.bits.length);
    const view = new DataView(buffer.buffer);

    view.setUint32(0, MAGIC, true);
    view.setUint32(4, VERSION, true);
    view.setUint32(8, this.numBits, true);
    view.setUint32(12, this.numHashes, true);
    view.setUint32(16, this.itemCount, true);

    buffer.set(this.bits, HEADER_SIZE);
    return buffer;
  }

  /**
   * Deserialize from a binary Uint8Array produced by .serialize().
   */
  static deserialize(data: Uint8Array): BloomFilter {
    if (data.length < HEADER_SIZE) {
      throw new Error('BloomFilter: data too short for header');
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const magic = view.getUint32(0, true);
    if (magic !== MAGIC) {
      throw new Error(
        `BloomFilter: invalid magic number 0x${magic.toString(16)}`,
      );
    }

    const version = view.getUint32(4, true);
    if (version !== VERSION) {
      throw new Error(`BloomFilter: unsupported version ${version}`);
    }

    const numBits = view.getUint32(8, true);
    const numHashes = view.getUint32(12, true);
    const itemCount = view.getUint32(16, true);
    const expectedBytes = Math.ceil(numBits / 8);

    if (data.length < HEADER_SIZE + expectedBytes) {
      throw new Error(
        `BloomFilter: data too short, need ${HEADER_SIZE + expectedBytes} bytes, got ${data.length}`,
      );
    }

    const filter = new BloomFilter({ numBits, numHashes });
    filter.itemCount = itemCount;
    const bitsSlice = data.subarray(HEADER_SIZE, HEADER_SIZE + expectedBytes);
    filter.bits.set(bitsSlice);

    return filter;
  }

  /** Number of items that were inserted (for diagnostics). */
  getItemCount(): number {
    return this.itemCount;
  }

  /** Estimated false positive rate at current fill level. */
  estimatedFalsePositiveRate(): number {
    const fillRatio = 1 - Math.exp((-this.numHashes * this.itemCount) / this.numBits);
    return Math.pow(fillRatio, this.numHashes);
  }
}
