/**
 * MurmurHash3 (32-bit) — fast, well-distributed hash for bloom filters.
 * Pure JS implementation, no dependencies.
 */
export function murmur3(key: string, seed: number): number {
  let h = seed >>> 0;
  const len = key.length;
  let i = 0;

  while (i + 4 <= len) {
    let k =
      (key.charCodeAt(i) & 0xffff) |
      ((key.charCodeAt(i + 1) & 0xffff) << 16);
    i += 2;
    k |= 0;

    // Second pair
    const k2 =
      (key.charCodeAt(i) & 0xffff) |
      ((key.charCodeAt(i + 1) & 0xffff) << 16);
    i += 2;

    // Process first 32-bit chunk from two char pairs
    let combined = k;
    combined = Math.imul(combined, 0xcc9e2d51);
    combined = (combined << 15) | (combined >>> 17);
    combined = Math.imul(combined, 0x1b873593);
    h ^= combined;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;

    let combined2 = k2;
    combined2 = Math.imul(combined2, 0xcc9e2d51);
    combined2 = (combined2 << 15) | (combined2 >>> 17);
    combined2 = Math.imul(combined2, 0x1b873593);
    h ^= combined2;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }

  // Handle remaining characters (no switch-fallthrough for strict TS)
  let remaining = 0;
  const tail = len - i;
  if (tail >= 3) remaining ^= (key.charCodeAt(i + 2) & 0xffff) << 16;
  if (tail >= 2) remaining ^= (key.charCodeAt(i + 1) & 0xffff) << 8;
  if (tail >= 1) {
    remaining ^= key.charCodeAt(i) & 0xffff;
    remaining = Math.imul(remaining, 0xcc9e2d51);
    remaining = (remaining << 15) | (remaining >>> 17);
    remaining = Math.imul(remaining, 0x1b873593);
    h ^= remaining;
  }

  h ^= len;

  // Finalization mix
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  return h >>> 0;
}
