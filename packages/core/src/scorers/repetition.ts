import type { Scorer, ScorerResult } from '../types.js';

/**
 * Repetition pattern detector.
 *
 * Detects:
 * - Run-length repetition: "aaaa", "bbb"
 * - Pattern repetition: "abcabc", "xyzxyz"
 *
 * High repetition = likely gibberish.
 */
export const repetitionScorer: Scorer = {
  name: 'repetition',
  minLength: 3,
  defaultWeight: 0.12,

  score(token: string): ScorerResult {
    const lower = token.toLowerCase();
    const len = lower.length;

    // 1. Check run-length repetition (consecutive same characters)
    let maxRun = 1;
    let currentRun = 1;
    for (let i = 1; i < len; i++) {
      if (lower[i] === lower[i - 1]) {
        currentRun++;
        maxRun = Math.max(maxRun, currentRun);
      } else {
        currentRun = 1;
      }
    }

    const runRatio = maxRun / len;

    // 2. Check pattern repetition (repeating substring patterns)
    let patternScore = 0;
    let detectedPattern = '';

    // Try pattern lengths from 1 to len/2
    for (let patLen = 1; patLen <= len / 2; patLen++) {
      const pattern = lower.substring(0, patLen);
      let matches = 0;
      let pos = 0;

      while (pos + patLen <= len) {
        if (lower.substring(pos, pos + patLen) === pattern) {
          matches++;
          pos += patLen;
        } else {
          break;
        }
      }

      // How much of the string is covered by this repeating pattern
      const coverage = (matches * patLen) / len;

      if (coverage > 0.7 && matches >= 2) {
        const thisScore = coverage * (1 - patLen / len);
        if (thisScore > patternScore) {
          patternScore = thisScore;
          detectedPattern = pattern;
        }
      }
    }

    // Combine signals
    let score: number;
    let type: string;

    if (runRatio > 0.6) {
      // Dominated by run-length repetition
      score = Math.min(1, runRatio * 1.2);
      type = 'run_length';
    } else if (patternScore > 0) {
      score = Math.min(1, patternScore);
      type = 'pattern';
    } else if (runRatio > 0.5) {
      // Moderate run-length — only flag when majority is repetition
      score = (runRatio - 0.5) * 1.6;
      type = 'moderate_run';
    } else {
      return {
        score: 0,
        confidence: 0,
        details: { maxRun, runRatio, patternScore },
      };
    }

    // Confidence: low for short tokens, high for long ones with clear patterns
    const confidence = Math.min(1, (len - 2) / 6) * Math.max(runRatio, patternScore, 0.5);

    return {
      score: Math.min(1, Math.max(0, score)),
      confidence,
      details: {
        maxRun,
        runRatio,
        patternScore,
        detectedPattern: detectedPattern || null,
        type,
      },
    };
  },
};
