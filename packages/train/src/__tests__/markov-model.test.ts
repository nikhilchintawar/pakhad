import { describe, it, expect } from 'vitest';
import { MarkovModel } from '../runtime/markov-model.js';

describe('MarkovModel', () => {
  const sampleCorpus = [
    'john', 'james', 'jennifer', 'joseph', 'jessica',
    'michael', 'matthew', 'maria', 'margaret', 'melissa',
    'william', 'walter', 'wendy', 'warren', 'wilson',
    'robert', 'richard', 'rachel', 'rebecca', 'ruth',
    'david', 'daniel', 'diana', 'donna', 'dorothy',
  ];

  it('should train from a corpus and score real names lower than gibberish', () => {
    const model = MarkovModel.train(sampleCorpus, 3);

    const realScore = model.scoreToken('john');
    const gibberishScore = model.scoreToken('xkqzvb');

    expect(realScore.score).toBeLessThan(gibberishScore.score);
  });

  it('should score tokens that appear in training data as low gibberish', () => {
    const model = MarkovModel.train(sampleCorpus, 3);

    const result = model.scoreToken('james');
    expect(result.score).toBeLessThan(0.5);
    expect(result.avgLogProb).toBeLessThan(0);
  });

  it('should score random character sequences as high gibberish', () => {
    const model = MarkovModel.train(sampleCorpus, 3);

    const result = model.scoreToken('zxqwpk');
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('should handle tokens shorter than the order', () => {
    const model = MarkovModel.train(sampleCorpus, 3);

    const result = model.scoreToken('ab');
    expect(result.score).toBe(0);
    expect(result.avgLogProb).toBe(0);
  });

  it('should round-trip through serialize/deserialize', () => {
    const original = MarkovModel.train(sampleCorpus, 3);

    const serialized = original.serialize();
    const restored = MarkovModel.deserialize(serialized);

    expect(restored.order).toBe(original.order);
    expect(restored.alphabetSize).toBe(original.alphabetSize);
    expect(restored.size).toBe(original.size);

    // Scores should be identical after round-trip
    const origScore = original.scoreToken('john');
    const restoredScore = restored.scoreToken('john');
    expect(restoredScore.score).toBeCloseTo(origScore.score, 5);
  });

  it('should reject invalid binary data', () => {
    // Too short for header
    expect(() => MarkovModel.deserialize(new Uint8Array(2))).toThrow(
      'too short',
    );
    expect(() => MarkovModel.deserialize(new Uint8Array(15))).toThrow(
      'too short',
    );

    // Long enough for header but wrong magic
    const badMagic = new Uint8Array(20);
    badMagic[0] = 0xff;
    expect(() => MarkovModel.deserialize(badMagic)).toThrow('invalid magic');
  });

  it('should respect n-gram order', () => {
    const bigramModel = MarkovModel.train(sampleCorpus, 2);
    const trigramModel = MarkovModel.train(sampleCorpus, 3);

    expect(bigramModel.order).toBe(2);
    expect(trigramModel.order).toBe(3);
    // Trigram model should have different (typically fewer) entries
    // since trigrams are more specific
    expect(bigramModel.size).not.toBe(trigramModel.size);
  });

  it('should handle single-character alphabet gracefully', () => {
    const model = MarkovModel.train(['aaa', 'aaaa', 'aaaaa'], 2);
    const result = model.scoreToken('aaa');
    // Known token in a tiny alphabet should not be flagged as gibberish
    expect(result.score).toBeLessThanOrEqual(0.5);
  });
});
