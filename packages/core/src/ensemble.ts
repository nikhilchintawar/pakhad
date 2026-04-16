import type {
  Scorer,
  ScorerContext,
  TokenResult,
  TokenScorerDetail,
  DetectOptions,
  LoadedLocale,
  FieldType,
  Token,
} from './types.js';

export interface EnsembleConfig {
  scorers: Scorer[];
  locale: LoadedLocale;
  fieldType: FieldType;
  allTokenTexts: string[];
  options: DetectOptions;
}

/**
 * Score a single token against all scorers, combining results via
 * confidence-weighted average.
 */
export function scoreToken(
  token: Token,
  tokenIndex: number,
  config: EnsembleConfig,
): TokenResult {
  const ctx: ScorerContext = {
    fieldType: config.fieldType,
    locale: config.locale,
    allTokens: config.allTokenTexts,
    tokenIndex,
  };

  const scorerDetails: TokenScorerDetail[] = [];
  let weightedScoreSum = 0;
  let weightSum = 0;

  for (const scorer of config.scorers) {
    // Check if scorer is disabled or reweighted via options
    const override = config.options.scorers?.[scorer.name];
    if (override?.enabled === false) continue;

    // Skip if token is too short for this scorer
    if (scorer.minLength !== undefined && token.text.length < scorer.minLength) {
      continue;
    }

    const result = scorer.score(token.text, ctx);

    // Skip scorers with zero confidence (they have no opinion)
    if (result.confidence === 0) continue;

    const weight = override?.weight ?? scorer.defaultWeight;

    scorerDetails.push({
      name: scorer.name,
      score: result.score,
      confidence: result.confidence,
      weight,
      details: result.details,
    });

    // Confidence-weighted contribution
    const effectiveWeight = weight * result.confidence;
    weightedScoreSum += result.score * effectiveWeight;
    weightSum += effectiveWeight;
  }

  const tokenScore = weightSum > 0 ? weightedScoreSum / weightSum : 0;

  return {
    text: token.text,
    score: tokenScore,
    label: labelFromScore(tokenScore, config.options),
    matchedLocale: config.locale.id,
    scorers: scorerDetails,
  };
}

/**
 * Aggregate token-level scores into an input-level score.
 * Uses length-weighted mean: longer tokens count more.
 */
export function aggregateTokenScores(tokenResults: TokenResult[]): number {
  if (tokenResults.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const tr of tokenResults) {
    const weight = tr.text.length;
    weightedSum += tr.score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Map a 0-1 score to a label.
 */
export function labelFromScore(
  score: number,
  options?: DetectOptions,
): 'clean' | 'suspicious' | 'gibberish' {
  const suspiciousThreshold = options?.thresholds?.suspicious ?? 0.3;
  const gibberishThreshold = options?.thresholds?.gibberish ?? 0.65;

  if (score >= gibberishThreshold) return 'gibberish';
  if (score >= suspiciousThreshold) return 'suspicious';
  return 'clean';
}
