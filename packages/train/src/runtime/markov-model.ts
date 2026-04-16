/**
 * Serialized n-gram Markov model for character-level transition probabilities.
 *
 * The model stores log-probabilities for character n-gram transitions.
 * At query time, a token's Markov score is the average log-probability
 * of its n-gram transitions, normalized to a 0-1 gibberish score.
 *
 * Binary format:
 *   [4 bytes] magic number 0x4D4B4F56 ("MKOV")
 *   [4 bytes] version (1)
 *   [4 bytes] order (uint32 LE) — n-gram order (2 = bigram, 3 = trigram)
 *   [4 bytes] numEntries (uint32 LE)
 *   [4 bytes] alphabetSize (uint32 LE) — number of unique chars in training
 *   For each entry:
 *     [2 bytes] key length (uint16 LE)
 *     [N bytes] key (UTF-8)
 *     [4 bytes] log-probability (float32 LE)
 *
 * In-memory representation is a Map<string, number> of n-gram -> log-prob.
 */

const MAGIC = 0x4d4b4f56; // "MKOV"
const VERSION = 1;
const HEADER_SIZE = 20;

export interface MarkovModelData {
  order: number;
  alphabetSize: number;
  transitions: Map<string, number>;
}

export class MarkovModel {
  readonly order: number;
  readonly alphabetSize: number;
  private readonly transitions: Map<string, number>;
  // Floor log-prob for unseen n-grams — penalizes unknown transitions
  private readonly unseenLogProb: number;

  constructor(data: MarkovModelData) {
    this.order = data.order;
    this.alphabetSize = data.alphabetSize;
    this.transitions = data.transitions;
    // Unseen n-gram gets a log-prob slightly worse than the worst seen
    this.unseenLogProb = this.computeUnseenLogProb();
  }

  private computeUnseenLogProb(): number {
    let minLogProb = 0;
    for (const lp of this.transitions.values()) {
      if (lp < minLogProb) minLogProb = lp;
    }
    // 2x worse than the worst seen transition
    return minLogProb * 2;
  }

  /**
   * Get the log-probability for a given n-gram.
   * Returns the unseen floor value for unknown n-grams.
   */
  getLogProb(ngram: string): number {
    return this.transitions.get(ngram) ?? this.unseenLogProb;
  }

  /**
   * Score a token: average log-probability of its n-gram transitions,
   * normalized to 0-1 where 0 = perfectly normal and 1 = gibberish.
   *
   * Returns { score, avgLogProb } for diagnostics.
   */
  scoreToken(token: string): { score: number; avgLogProb: number } {
    const lower = token.toLowerCase();
    if (lower.length < this.order) {
      return { score: 0, avgLogProb: 0 };
    }

    let sumLogProb = 0;
    let count = 0;

    for (let i = 0; i <= lower.length - this.order; i++) {
      const ngram = lower.substring(i, i + this.order);
      sumLogProb += this.getLogProb(ngram);
      count++;
    }

    if (count === 0) return { score: 0, avgLogProb: 0 };

    const avgLogProb = sumLogProb / count;

    // Normalize: map avg log-prob to 0-1 gibberish score.
    // avgLogProb is negative: closer to 0 = normal text, very negative = gibberish.
    // We use a sigmoid centered between "typical" and "unseen" log-probs.
    // Negate the exponent so that more-negative avgLogProb → higher score.
    const midpoint = this.unseenLogProb * 0.35;
    const steepness = 4 / Math.abs(this.unseenLogProb || 1);
    const rawScore = 1 / (1 + Math.exp(steepness * (avgLogProb - midpoint)));

    // Clamp to [0, 1]
    const score = Math.max(0, Math.min(1, rawScore));

    return { score, avgLogProb };
  }

  /**
   * Build a MarkovModel from a corpus of strings (e.g., a list of names).
   * Counts n-gram frequencies and converts to log-probabilities.
   */
  static train(corpus: string[], order: number = 3): MarkovModel {
    const counts = new Map<string, number>();
    const prefixCounts = new Map<string, number>();
    const alphabet = new Set<string>();

    for (const word of corpus) {
      const lower = word.toLowerCase().trim();
      for (const ch of lower) alphabet.add(ch);

      for (let i = 0; i <= lower.length - order; i++) {
        const ngram = lower.substring(i, i + order);
        counts.set(ngram, (counts.get(ngram) ?? 0) + 1);

        const prefix = ngram.substring(0, order - 1);
        prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
      }
    }

    // Convert counts to log-probabilities with Laplace smoothing
    const transitions = new Map<string, number>();
    const smoothing = 0.1;
    const vocabSize = alphabet.size;

    for (const [ngram, count] of counts) {
      const prefix = ngram.substring(0, order - 1);
      const prefixCount = prefixCounts.get(prefix) ?? 0;
      const prob = (count + smoothing) / (prefixCount + smoothing * vocabSize);
      transitions.set(ngram, Math.log(prob));
    }

    return new MarkovModel({
      order,
      alphabetSize: vocabSize,
      transitions,
    });
  }

  /**
   * Serialize to binary format (Uint8Array).
   */
  serialize(): Uint8Array {
    const encoder = new TextEncoder();
    const entries: Array<{ keyBytes: Uint8Array; logProb: number }> = [];
    let totalKeyBytes = 0;

    for (const [key, logProb] of this.transitions) {
      const keyBytes = encoder.encode(key);
      entries.push({ keyBytes, logProb });
      totalKeyBytes += keyBytes.length;
    }

    // Total size: header + entries * (2 bytes key-len + key + 4 bytes float)
    const totalSize =
      HEADER_SIZE + entries.length * 6 + totalKeyBytes;
    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    view.setUint32(0, MAGIC, true);
    view.setUint32(4, VERSION, true);
    view.setUint32(8, this.order, true);
    view.setUint32(12, entries.length, true);
    view.setUint32(16, this.alphabetSize, true);

    let offset = HEADER_SIZE;
    for (const entry of entries) {
      view.setUint16(offset, entry.keyBytes.length, true);
      offset += 2;
      buffer.set(entry.keyBytes, offset);
      offset += entry.keyBytes.length;
      view.setFloat32(offset, entry.logProb, true);
      offset += 4;
    }

    return buffer;
  }

  /**
   * Deserialize from binary Uint8Array produced by .serialize().
   */
  static deserialize(data: Uint8Array): MarkovModel {
    if (data.length < HEADER_SIZE) {
      throw new Error('MarkovModel: data too short for header');
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const magic = view.getUint32(0, true);
    if (magic !== MAGIC) {
      throw new Error(
        `MarkovModel: invalid magic number 0x${magic.toString(16)}`,
      );
    }

    const version = view.getUint32(4, true);
    if (version !== VERSION) {
      throw new Error(`MarkovModel: unsupported version ${version}`);
    }

    const order = view.getUint32(8, true);
    const numEntries = view.getUint32(12, true);
    const alphabetSize = view.getUint32(16, true);

    const decoder = new TextDecoder();
    const transitions = new Map<string, number>();
    let offset = HEADER_SIZE;

    for (let i = 0; i < numEntries; i++) {
      if (offset + 2 > data.length) {
        throw new Error(`MarkovModel: unexpected end of data at entry ${i}`);
      }
      const keyLen = view.getUint16(offset, true);
      offset += 2;

      if (offset + keyLen + 4 > data.length) {
        throw new Error(`MarkovModel: unexpected end of data at entry ${i}`);
      }
      const key = decoder.decode(data.subarray(offset, offset + keyLen));
      offset += keyLen;

      const logProb = view.getFloat32(offset, true);
      offset += 4;

      transitions.set(key, logProb);
    }

    return new MarkovModel({ order, alphabetSize, transitions });
  }

  /** Number of n-gram entries in the model. */
  get size(): number {
    return this.transitions.size;
  }
}
