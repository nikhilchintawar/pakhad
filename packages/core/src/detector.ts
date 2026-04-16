import type {
  Detector,
  DetectorConfig,
  DetectOptions,
  DetectResult,
  FieldType,
  LoadedLocale,
  LocaleMode,
  Scorer,
} from './types.js';
import { tokenize } from './tokenizer.js';
import { inferFieldType } from './field-type.js';
import { defaultScorers } from './scorers/index.js';
import {
  scoreToken,
  aggregateTokenScores,
  labelFromScore,
} from './ensemble.js';
import {
  resolveLocales,
  matchTokenLocales,
} from './locale-resolver.js';
import { VERSION } from './version.js';

/**
 * Create a stateful pakhad detector instance.
 *
 * Preferred for production use — lets you configure locales and defaults once,
 * then call detect() many times.
 */
export function create(config: DetectorConfig): Detector {
  if (config.locales.length === 0) {
    throw new Error('pakhad: at least one locale must be provided');
  }

  const registeredScorers: Scorer[] = [...defaultScorers];

  return {
    detect(input: string, options: DetectOptions = {}): DetectResult {
      return runDetection(input, {
        options,
        locales: config.locales,
        defaults: config.defaults,
        scorers: registeredScorers,
      });
    },

    registerScorer(scorer: Scorer): void {
      // Replace if a scorer with the same name already exists
      const existingIndex = registeredScorers.findIndex(
        (s) => s.name === scorer.name,
      );
      if (existingIndex >= 0) {
        registeredScorers[existingIndex] = scorer;
      } else {
        registeredScorers.push(scorer);
      }
    },
  };
}

interface DetectionContext {
  options: DetectOptions;
  locales: LoadedLocale[];
  defaults?: { fieldType?: FieldType; locale?: LocaleMode };
  scorers: Scorer[];
}

function runDetection(input: string, ctx: DetectionContext): DetectResult {
  const startTime = performance.now();

  // Tokenize
  const tokens = tokenize(input);

  // Field type: provided > default > inferred
  const providedFieldType = ctx.options.fieldType ?? ctx.defaults?.fieldType ?? null;
  const inferredFieldType = inferFieldType(input, tokens);
  const effectiveFieldType = providedFieldType ?? inferredFieldType;

  // Warnings
  const warnings: string[] = [];
  if (
    providedFieldType !== null &&
    providedFieldType !== inferredFieldType
  ) {
    warnings.push('field_type_mismatch');
  }

  // Locale resolution
  const localeMode = ctx.options.locale ?? ctx.defaults?.locale ?? 'auto';
  const { script, candidates } = resolveLocales(
    localeMode,
    ctx.locales,
    input,
  );
  const tokenLocaleMap = matchTokenLocales(tokens, candidates);

  // Handle empty input
  if (tokens.length === 0) {
    return {
      score: 0,
      label: 'clean',
      fieldType: {
        provided: providedFieldType,
        inferred: inferredFieldType,
      },
      locale: {
        mode: localeMode,
        script,
        candidates: candidates.map((c) => c.id),
        matched: {},
      },
      tokens: [],
      warnings,
      durationMs: performance.now() - startTime,
      version: VERSION,
    };
  }

  // Score each token
  const tokenResults = tokens.map((token, index) => {
    // Find the locale for this token
    const localeId = tokenLocaleMap[token.text] ?? candidates[0]?.id;
    const locale =
      candidates.find((c) => c.id === localeId) ?? candidates[0]!;

    return scoreToken(token, index, {
      scorers: ctx.scorers,
      locale,
      fieldType: effectiveFieldType,
      allTokenTexts: tokens.map((t) => t.text),
      options: ctx.options,
    });
  });

  // Aggregate
  const overallScore = aggregateTokenScores(tokenResults);

  return {
    score: overallScore,
    label: labelFromScore(overallScore, ctx.options),
    fieldType: {
      provided: providedFieldType,
      inferred: inferredFieldType,
    },
    locale: {
      mode: localeMode,
      script,
      candidates: candidates.map((c) => c.id),
      matched: tokenLocaleMap,
    },
    tokens: tokenResults,
    warnings,
    durationMs: performance.now() - startTime,
    version: VERSION,
  };
}
