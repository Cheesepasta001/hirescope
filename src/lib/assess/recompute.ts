import { db, writeJson } from "@/lib/db";
import { computeOverall, type OverallScore, type ScoredCompetency } from "./scoring";
import type { CompetencyScore } from "./score";

/**
 * Recompute an assessment's overall score from its stored score rows.
 *
 * There is exactly one path by which an overall score changes, and this is it.
 * Homework grading does not compute its own total and does not know the
 * weighting rule — it writes rows and calls this. That is what keeps the
 * homework-inclusive score and the interview-only score the same kind of number.
 *
 * Priorities come from the CriteriaSet the assessment was made under, not from
 * the criteria file as it stands now, so re-running this after HR edits the file
 * cannot silently reweight an old assessment.
 */
export async function recomputeAssessment(assessmentId: string): Promise<OverallScore | null> {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      scores: true,
      criteriaSet: { include: { competencies: { orderBy: { orderIndex: "asc" } } } },
      interview: { select: { candidateId: true } },
    },
  });

  if (!assessment) return null;

  const priorityByKey = new Map(
    (assessment.criteriaSet?.competencies ?? []).map((c) => [c.key, c.priority]),
  );
  const orderByKey = new Map(
    (assessment.criteriaSet?.competencies ?? []).map((c) => [c.key, c.orderIndex]),
  );

  const scored: ScoredCompetency[] = assessment.scores
    .slice()
    .sort(
      (a, b) =>
        (orderByKey.get(a.competencyKey) ?? 0) - (orderByKey.get(b.competencyKey) ?? 0),
    )
    .map((s) => ({
      competencyKey: s.competencyKey,
      label: s.label,
      score: s.score,
      priority: priorityByKey.get(s.competencyKey) ?? "medium",
      confidence: s.confidence as "low" | "medium" | "high",
      evidenceQuote: s.evidenceQuote,
      note: s.note,
      source: s.source as "interview" | "homework",
      reached: s.reached,
    }));

  const overall = computeOverall(scored);

  // The denormalised JSON keeps every row, including both sources for a
  // competency assessed twice, because the report shows them separately even
  // though the score merges them.
  const competenciesJson: CompetencyScore[] = scored.map((s) => ({
    competencyId: s.competencyKey,
    label: s.label,
    score: s.score,
    priority: s.priority,
    confidence: s.confidence,
    reached: s.reached,
    evidence: s.evidenceQuote,
    note: s.note,
    source: s.source,
  }));

  await db.assessment.update({
    where: { id: assessmentId },
    data: {
      overallScore: overall.overall,
      competenciesCounted: overall.counted,
      competenciesTotal: overall.total,
      competencies: writeJson(competenciesJson),
      // A run that ends up with no reached competency cannot support a positive
      // recommendation, however it got there.
      ...(overall.counted === 0 ? { recommendation: "insufficient_evidence" } : {}),
    },
  });

  // The candidate list ranks on the profile, so it has to move with the score.
  // The search text and embedding are deliberately left alone: homework changes
  // how well competencies are evidenced, not which skills the person has, and
  // re-embedding on every submission would spend an API call to move nothing.
  const profile = await db.candidateProfile.findUnique({
    where: { candidateId: assessment.interview.candidateId },
    select: { id: true, competencies: true },
  });

  if (profile) {
    await db.candidateProfile.update({
      where: { id: profile.id },
      data: {
        overallScore: overall.overall,
        competencies: writeJson(competenciesJson),
        ...(overall.counted === 0 ? { recommendation: "insufficient_evidence" } : {}),
      },
    });
  }

  return overall;
}
