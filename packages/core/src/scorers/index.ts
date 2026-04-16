export { entropyScorer } from './entropy.js';
export { keyboardWalkScorer } from './keyboard-walk.js';
export { repetitionScorer } from './repetition.js';
export { vowelConsonantScorer } from './vowel-consonant.js';
export { nameListScorer } from './name-list.js';
export { markovScorer } from './markov.js';
export { numericPatternScorer } from './numeric-pattern.js';
export { lengthAnomalyScorer } from './length-anomaly.js';

import type { Scorer } from '../types.js';
import { entropyScorer } from './entropy.js';
import { keyboardWalkScorer } from './keyboard-walk.js';
import { repetitionScorer } from './repetition.js';
import { vowelConsonantScorer } from './vowel-consonant.js';
import { nameListScorer } from './name-list.js';
import { markovScorer } from './markov.js';
import { numericPatternScorer } from './numeric-pattern.js';
import { lengthAnomalyScorer } from './length-anomaly.js';

/** All built-in scorers in their default order. */
export const defaultScorers: Scorer[] = [
  markovScorer,
  entropyScorer,
  keyboardWalkScorer,
  repetitionScorer,
  vowelConsonantScorer,
  nameListScorer,
  numericPatternScorer,
  lengthAnomalyScorer,
];
