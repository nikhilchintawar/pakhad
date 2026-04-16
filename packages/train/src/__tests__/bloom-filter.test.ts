import { describe, it, expect } from 'vitest';
import { BloomFilter } from '../runtime/bloom-filter.js';

describe('BloomFilter', () => {
  it('should report .has() = true for inserted items', () => {
    const bf = BloomFilter.create(100, 0.01);
    bf.add('hello');
    bf.add('world');
    bf.add('test');

    expect(bf.has('hello')).toBe(true);
    expect(bf.has('world')).toBe(true);
    expect(bf.has('test')).toBe(true);
  });

  it('should report .has() = false for items not inserted (with high probability)', () => {
    const bf = BloomFilter.create(100, 0.001);
    bf.add('hello');
    bf.add('world');

    // These should almost certainly be false
    expect(bf.has('foo')).toBe(false);
    expect(bf.has('bar')).toBe(false);
    expect(bf.has('baz')).toBe(false);
    expect(bf.has('qux')).toBe(false);
  });

  it('should round-trip through serialize/deserialize', () => {
    const original = BloomFilter.create(200, 0.001);
    const names = ['alice', 'bob', 'charlie', 'diana', 'eve'];
    for (const name of names) {
      original.add(name);
    }

    const serialized = original.serialize();
    const restored = BloomFilter.deserialize(serialized);

    for (const name of names) {
      expect(restored.has(name)).toBe(true);
    }
    expect(restored.has('frank')).toBe(false);
    expect(restored.numBits).toBe(original.numBits);
    expect(restored.numHashes).toBe(original.numHashes);
    expect(restored.getItemCount()).toBe(names.length);
  });

  it('should create optimal config for given parameters', () => {
    const config = BloomFilter.optimalConfig(1000, 0.001);
    expect(config.numBits).toBeGreaterThan(0);
    expect(config.numHashes).toBeGreaterThan(0);
    // For 1000 items at 0.1% FPR: ~14,378 bits, ~10 hashes
    expect(config.numBits).toBeGreaterThan(10000);
    expect(config.numHashes).toBeGreaterThanOrEqual(7);
  });

  it('should build from an iterable of items', () => {
    const names = ['john', 'jane', 'james', 'jennifer', 'joseph'];
    const bf = BloomFilter.fromItems(names, 0.001);

    for (const name of names) {
      expect(bf.has(name)).toBe(true);
    }
    expect(bf.has('zebra')).toBe(false);
    expect(bf.getItemCount()).toBe(names.length);
  });

  it('should reject invalid binary data', () => {
    // Too short for header
    expect(() => BloomFilter.deserialize(new Uint8Array(2))).toThrow(
      'too short',
    );
    expect(() => BloomFilter.deserialize(new Uint8Array(10))).toThrow(
      'too short',
    );

    // Long enough for header but wrong magic
    const badMagic = new Uint8Array(20);
    badMagic[0] = 0xff;
    expect(() => BloomFilter.deserialize(badMagic)).toThrow('invalid magic');
  });

  it('should maintain low false positive rate', () => {
    const n = 1000;
    const bf = BloomFilter.create(n, 0.01);
    for (let i = 0; i < n; i++) {
      bf.add(`item-${i}`);
    }

    // Check 10000 items that were NOT inserted
    let falsePositives = 0;
    const testSize = 10000;
    for (let i = 0; i < testSize; i++) {
      if (bf.has(`notinserted-${i}`)) {
        falsePositives++;
      }
    }

    // Should be around 1% — allow up to 3% for statistical variance
    expect(falsePositives / testSize).toBeLessThan(0.03);
  });

  it('should handle empty filter', () => {
    const bf = BloomFilter.create(10);
    expect(bf.has('anything')).toBe(false);
    expect(bf.getItemCount()).toBe(0);
  });

  it('should handle case-sensitive lookups', () => {
    const bf = BloomFilter.create(100);
    bf.add('Hello');
    expect(bf.has('Hello')).toBe(true);
    expect(bf.has('hello')).toBe(false);
  });
});
