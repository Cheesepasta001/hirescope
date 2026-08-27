import { db } from "@/lib/db";
import { resolveCriteria, type CriteriaCompetency } from "@/lib/criteria/load";
import { definitionHash, type Priority } from "@/lib/criteria/parse";
import {
  readAgainstRole,
  type CrossRoleOrigin,
  type CrossRoleResult,
  type SourceScore,
} from "./crossRole";

/**
 * Persistence and caching for cross-role reads.
 *
 * The unique constraint on (sourceAssessmentId, targetCriteriaSetId,
 * targetCriteriaVersion) is the cache. Asking the same question twice returns
 * the stored answer rather than paying for another model call — which also
 * means the number does not drift between viewings, and a manager who reloads
 * the page does not see it move.
 *
 * Kept separate from crossRole.ts so the scoring logic there can be exercised
 * without a database.
 */

export class CrossRoleNotPermittedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrossRoleNotPermittedError";
  }
}

export type PresentedCrossRoleRead = {
  id: string;
  targetRoleSlug: string;
  targetRoleTitle: string;
  targetCriteriaVersion: number;
  overallScore: number | null;
  belowFloor: boolean;
  floorReason: string | null;
  evidencedWeight: number;
  targetTotalWeight: number;
  evidencedCount: number;
  targetCompetencyCount: number;
  roleSpecificEvidenced: number;
  summary: string;
  createdAt: Date;
  competencies: {
    competencyKey: string;
    label: string;
    priority: string;
    origin: CrossRoleOrigin;
    score: number | null;
    confidence: "low" | "medium" | "high";
    evidenceQuote: string | null;
    note: string | null;
  }[];
};

/**
 * Get a cross-role read, computing it only if this exact question has not been
 * answered before.
 *
 * Refuses without consent. A cross-role read is a use of someone's interview
 * that they did not apply for, and the per-purpose consent posture in the rest
 * of the schema exists precisely so that "did this person agree to X" stays
 * answerable months later.
 */
export async function requestCrossRoleRead(args: {
  candidateId: string;
  targetRoleSlug: string;
}): Promise<PresentedCrossRoleRead> {
  const { candidateId, targetRoleSlug } = args;

  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      consentCrossRole: true,
      interviews: {
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: {
          id: true,
          roleTitle: true,
          roleSlug: true,
          seniority: true,
          turns: { orderBy: { idx: "asc" }, select: { role: true, text: true, competency: true } },
          criteriaSet: {
            include: { competencies: { orderBy: { orderIndex: "asc" } } },
          },
          assessment: { select: { id: true, scores: true } },
        },
      },
    },
  });

  if (!candidate) throw new CrossRoleNotPermittedError("Candidate not found.");
  if (!candidate.consentCrossRole) {
    throw new CrossRoleNotPermittedError(
      "This candidate did not consent to being considered for other roles, so their "
      + "interview cannot be read against one.",
    );
  }

  const interview = candidate.interviews[0];
  if (!interview?.assessment) {
    throw new CrossRoleNotPermittedError("This candidate has no completed assessment to read from.");
  }
  if (!interview.criteriaSet) {
    throw new CrossRoleNotPermittedError(
      "This interview predates file-driven criteria, so there is no definition to compare against.",
    );
  }
  if (interview.roleSlug === targetRoleSlug) {
    throw new CrossRoleNotPermittedError(
      "That is the role this candidate was actually interviewed for — read the primary "
      + "assessment instead.",
    );
  }

  const target = await resolveCriteria(targetRoleSlug);

  // The cache. Same interview, same role, same version of that role's file.
  const cached = await db.crossRoleRead.findUnique({
    where: {
      sourceAssessmentId_targetCriteriaSetId_targetCriteriaVersion: {
        sourceAssessmentId: interview.assessment.id,
        targetCriteriaSetId: target.criteriaSetId,
        targetCriteriaVersion: target.version,
      },
    },
    include: { scores: { orderBy: { orderIndex: "asc" } }, targetCriteriaSet: true },
  });

  if (cached) return present(cached);

  // The interview's own frozen criteria set, which may predate definitionHash.
  // Recomputing a missing hash from the row's own text is a repair, not a
  // reinterpretation — and without it Path A silently never matches for older
  // interviews, which looks like it works while quietly re-scoring definitions
  // that were identical.
  const sourceCompetencies: CriteriaCompetency[] = interview.criteriaSet.competencies.map((c) => ({
    key: c.key,
    label: c.label,
    description: c.description,
    strongAnswer: c.strongAnswer,
    weakAnswer: c.weakAnswer,
    priority: c.priority as Priority,
    definitionHash: c.definitionHash || definitionHash(c),
  }));

  // Interview scores only. Homework rows are scored against the *source* role's
  // task and do not describe the target role's competencies.
  const sourceScores: SourceScore[] = interview.assessment.scores
    .filter((s) => s.source === "interview")
    .map((s) => ({
      competencyKey: s.competencyKey,
      score: s.score,
      confidence: s.confidence as "low" | "medium" | "high",
      evidenceQuote: s.evidenceQuote,
      note: s.note,
      reached: s.reached,
    }));

  const result: CrossRoleResult = await readAgainstRole({
    sourceCompetencies,
    sourceScores,
    targetCompetencies: target.competencies,
    targetRoleTitle: target.roleTitle,
    sourceRoleTitle: interview.roleTitle,
    seniority: interview.seniority,
    transcript: interview.turns.map((t) => ({
      role: t.role as "interviewer" | "candidate",
      text: t.text,
      competency: t.competency,
    })),
  });

  const created = await db.crossRoleRead.create({
    data: {
      candidateId: candidate.id,
      sourceAssessmentId: interview.assessment.id,
      targetCriteriaSetId: target.criteriaSetId,
      targetCriteriaVersion: target.version,
      overallScore: result.overallScore,
      evidencedWeight: result.evidencedWeight,
      targetTotalWeight: result.targetTotalWeight,
      evidencedCount: result.evidencedCount,
      targetCompetencyCount: result.targetCompetencyCount,
      roleSpecificEvidenced: result.roleSpecificEvidenced,
      // The floor reason is stored with the read rather than recomputed, so the
      // explanation cannot drift from the number it explains.
      summary: result.floorReason ? `${result.floorReason}\n\n${result.summary}` : result.summary,
      scores: {
        create: result.competencies.map((c) => ({
          competencyKey: c.competencyKey,
          label: c.label,
          priority: c.priority,
          orderIndex: c.orderIndex,
          origin: c.origin,
          score: c.score,
          confidence: c.confidence,
          evidenceQuote: c.evidenceQuote,
          note: c.note,
        })),
      },
    },
    include: { scores: { orderBy: { orderIndex: "asc" } }, targetCriteriaSet: true },
  });

  return present(created);
}

/** Reads already computed for this candidate. Never triggers a model call. */
export async function listCrossRoleReads(candidateId: string): Promise<PresentedCrossRoleRead[]> {
  const rows = await db.crossRoleRead.findMany({
    where: { candidateId },
    orderBy: { createdAt: "desc" },
    include: { scores: { orderBy: { orderIndex: "asc" } }, targetCriteriaSet: true },
  });
  return rows.map(present);
}

type ReadRow = {
  id: string;
  targetCriteriaVersion: number;
  overallScore: number | null;
  evidencedWeight: number;
  targetTotalWeight: number;
  evidencedCount: number;
  targetCompetencyCount: number;
  roleSpecificEvidenced: number;
  summary: string;
  createdAt: Date;
  targetCriteriaSet: { roleSlug: string; roleTitle: string };
  scores: {
    competencyKey: string;
    label: string;
    priority: string;
    origin: string;
    score: number | null;
    confidence: string;
    evidenceQuote: string | null;
    note: string | null;
  }[];
};

function present(row: ReadRow): PresentedCrossRoleRead {
  return {
    id: row.id,
    targetRoleSlug: row.targetCriteriaSet.roleSlug,
    targetRoleTitle: row.targetCriteriaSet.roleTitle,
    targetCriteriaVersion: row.targetCriteriaVersion,
    overallScore: row.overallScore,
    // A stored null overall is exactly the below-floor case; there is no other
    // way for it to be null, so it does not need its own column.
    belowFloor: row.overallScore === null,
    floorReason: row.overallScore === null ? row.summary.split("\n\n")[0] : null,
    evidencedWeight: row.evidencedWeight,
    targetTotalWeight: row.targetTotalWeight,
    evidencedCount: row.evidencedCount,
    targetCompetencyCount: row.targetCompetencyCount,
    roleSpecificEvidenced: row.roleSpecificEvidenced,
    summary: row.overallScore === null
      ? row.summary.split("\n\n").slice(1).join("\n\n") || row.summary
      : row.summary,
    createdAt: row.createdAt,
    competencies: row.scores.map((s) => ({
      competencyKey: s.competencyKey,
      label: s.label,
      priority: s.priority,
      origin: s.origin as CrossRoleOrigin,
      score: s.score,
      confidence: s.confidence as "low" | "medium" | "high",
      evidenceQuote: s.evidenceQuote,
      note: s.note,
    })),
  };
}
