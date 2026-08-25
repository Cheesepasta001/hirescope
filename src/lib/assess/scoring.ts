/**
 * The scoring rule. One file, one function, weights as named constants.
 *
 * Everything that needs an overall score calls `computeOverall`. The arithmetic
 * is deliberately not inlined anywhere else: a hiring score that is computed
 * two slightly different ways in two places is a score nobody can defend, and
 * "reproducible by hand from the per-competency scores" is an acceptance
 * criterion, not a nicety.
 *
 * The rule, in words:
 *   - Each competency is scored 0-10.
 *   - Its priority in the criteria file sets its weight: high 3, medium 2, low 1.
 *   - Overall is the weighted mean of the reached competencies, rescaled to 0-100.
 *   - Competencies the interview never reached are excluded from the mean
 *     entirely, rather than scored zero. Scoring an untested competency zero
 *     would punish a candidate for the interview's coverage gaps.
 *   - How many competencies the score rests on is returned alongside it, so no
 *     screen can show a score from three of eight competencies as if it were a
 *     score from all eight.
 */

import type { Priority } from "@/lib/criteria/parse";

export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Falls back to medium for a priority string from an older record. */
export function weightFor(priority: string): number {
  return PRIORITY_WEIGHTS[priority as Priority] ?? PRIORITY_WEIGHTS.medium;
}

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;

export type ScoredCompetency = {
  competencyKey: string;
  label: string;
  /** 0-10. Ignored when `reached` is false. */
  score: number;
  priority: string;
  confidence: "low" | "medium" | "high";
  evidenceQuote: string;
  note: string;
  source: "interview" | "homework";
  /** False when nothing in the interview or homework spoke to this competency. */
  reached: boolean;
};

export type OverallScore = {
  /** 0-100, rounded. Compatible with the existing integer score columns. */
  overall: number;
  /** How many competencies the number actually rests on. */
  counted: number;
  /** How many the criteria file defines. */
  total: number;
  /** Sum of the weights that went into the mean, for anyone checking by hand. */
  weightSum: number;
  /** Keys excluded from the mean, so the UI can name them. */
  unreached: string[];
};

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return SCORE_MIN;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, score));
}

/**
 * Weighted mean of the reached competencies, rescaled to 0-100.
 *
 * Where the same competency is scored by both the interview and the homework,
 * the two are averaged first so a competency assessed twice does not count twice
 * — see `mergeBySource`.
 */
export function computeOverall(scores: ScoredCompetency[]): OverallScore {
  const merged = mergeBySource(scores);
  const reached = merged.filter((s) => s.reached);

  const weightSum = reached.reduce((sum, s) => sum + weightFor(s.priority), 0);
  const weighted = reached.reduce(
    (sum, s) => sum + clampScore(s.score) * weightFor(s.priority),
    0,
  );

  return {
    // No reached competency means no score, not a zero. Callers pair this with
    // the "insufficient_evidence" recommendation.
    overall: weightSum === 0 ? 0 : Math.round((weighted / weightSum) * 10),
    counted: reached.length,
    total: merged.length,
    weightSum,
    unreached: merged.filter((s) => !s.reached).map((s) => s.competencyKey),
  };
}

/**
 * Collapse interview and homework scores for the same competency into one.
 *
 * A competency assessed in both places is the normal case for homework, which
 * targets exactly the competencies the interview left thin. Averaging the two
 * keeps its weight the same as every other competency's; summing them would
 * quietly double the influence of whatever the homework happened to cover.
 *
 * A reached score always beats an unreached one — homework evidence is the point.
 */
export function mergeBySource(scores: ScoredCompetency[]): ScoredCompetency[] {
  const byKey = new Map<string, ScoredCompetency[]>();
  for (const s of scores) {
    const list = byKey.get(s.competencyKey);
    if (list) list.push(s);
    else byKey.set(s.competencyKey, [s]);
  }

  return [...byKey.values()].map((group) => {
    if (group.length === 1) return group[0];

    const reached = group.filter((s) => s.reached);
    if (reached.length === 0) return group[0];
    if (reached.length === 1) return reached[0];

    const mean = reached.reduce((sum, s) => sum + clampScore(s.score), 0) / reached.length;
    // Keep the interview's row as the base so its evidence quote survives, and
    // report the pair as one combined result.
    const base = reached.find((s) => s.source === "interview") ?? reached[0];
    const other = reached.find((s) => s !== base);

    return {
      ...base,
      score: mean,
      confidence: bestConfidence(reached.map((s) => s.confidence)),
      note: other ? `${base.note} Homework: ${other.note}` : base.note,
    };
  });
}

const CONFIDENCE_ORDER = ["low", "medium", "high"] as const;

/** Two independent assessments of one competency are worth more than either alone. */
function bestConfidence(levels: ("low" | "medium" | "high")[]): "low" | "medium" | "high" {
  return levels.reduce((best, level) =>
    CONFIDENCE_ORDER.indexOf(level) > CONFIDENCE_ORDER.indexOf(best) ? level : best,
  "low");
}

/**
 * A plain-language statement of how the overall score was reached, shown next to
 * the number. A weighted mean that a manager cannot reproduce is a black box,
 * and a black box is the thing the brief is trying to get away from.
 */
export function explainOverall(result: OverallScore): string {
  if (result.counted === 0) {
    return "No competency was assessed, so there is no overall score.";
  }
  const base =
    `Weighted mean of ${result.counted} of ${result.total} competencies `
    + `(total weight ${result.weightSum}), rescaled from 0-10 to 0-100.`;
  return result.unreached.length
    ? `${base} ${result.unreached.length} competenc${result.unreached.length === 1 ? "y was" : "ies were"} `
      + `not reached and ${result.unreached.length === 1 ? "is" : "are"} excluded rather than scored zero.`
    : base;
}
