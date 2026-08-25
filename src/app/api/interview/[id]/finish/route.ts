import { NextResponse } from "next/server";
import { db, readJson, writeJson } from "@/lib/db";
import { describeApiError } from "@/lib/claude";
import {
  buildAssessment,
  buildSearchText,
  toCompetencyScores,
  type AssessmentResult,
} from "@/lib/assess/score";
import { buildIntegrityReport, type RawSignal, type SignalType } from "@/lib/integrity/signals";
import type { StylometryResult } from "@/lib/integrity/stylometry";
import { reconcileWithInterview } from "@/lib/verify/consistency";
import { embed } from "@/lib/embeddings";
import type { InterviewPlan } from "@/lib/interview/plan";
import type { ExtractedResume } from "@/lib/resume/schema";
import { unreachedCompetencies, type TurnRecord } from "@/lib/interview/engine";
import type { NextTurn } from "@/lib/interview/engine";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Close the interview and produce everything downstream of it: the assessment,
 * the skill diagram data, the searchable tags, and the manager-facing profile.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const interview = await db.interview.findUnique({
      where: { id },
      include: {
        resume: true,
        candidate: true,
        turns: { orderBy: { idx: "asc" } },
        integrityEvents: true,
        assessment: true,
      },
    });

    if (!interview) return NextResponse.json({ error: "Interview not found." }, { status: 404 });
    if (interview.assessment) {
      return NextResponse.json({ ok: true, alreadyComplete: true, candidateId: interview.candidateId });
    }

    const plan = readJson<InterviewPlan | null>(interview.plan, null);
    const resume = readJson<ExtractedResume | null>(interview.resume.extracted, null);
    if (!plan || !resume) {
      return NextResponse.json({ error: "This interview is missing its plan or resume data." }, { status: 500 });
    }

    const answered = interview.turns.filter((t) => t.role === "candidate").length;
    if (answered < 2) {
      return NextResponse.json(
        { error: "Not enough of the interview was completed to assess. At least two answers are needed." },
        { status: 400 },
      );
    }

    const appraisals = interview.turns
      .map((t) => readJson<NextTurn["appraisal"] | null>(t.appraisal, null))
      .filter((a): a is NextTurn["appraisal"] => a !== null);

    // Which competencies the interview never asked about, counted from the
    // turns rather than inferred by the model.
    const turnRecords: TurnRecord[] = interview.turns.map((t) => ({
      role: t.role as "interviewer" | "candidate",
      text: t.text,
      competency: t.competency,
      probeDepth: t.probeDepth,
    }));

    const assessment: AssessmentResult = await buildAssessment({
      resume,
      plan,
      transcript: interview.turns.map((t) => ({
        role: t.role as "interviewer" | "candidate",
        text: t.text,
        competency: t.competency,
      })),
      appraisals,
      unreached: unreachedCompetencies(plan, turnRecords),
    });

    const competencyScores = toCompetencyScores(assessment.scored);

    // Integrity is assembled separately and never enters the scoring call.
    const stylometry = interview.turns
      .map((t, i) => {
        const s = readJson<StylometryResult | null>(t.stylometry, null);
        return s ? { turnIdx: i, machineLikelihood: s.machineLikelihood, reason: s.reason } : null;
      })
      .filter((s): s is { turnIdx: number; machineLikelihood: number; reason: string } => s !== null);

    const integrity = buildIntegrityReport(
      interview.integrityEvents.map(
        (e): RawSignal => ({ type: e.type as SignalType, at: e.at.toISOString() }),
      ),
      interview.turns
        .filter((t) => t.role === "candidate")
        .map((t) => ({
          turnIdx: t.idx,
          latencyMsFirstKey: t.latencyMsFirstKey,
          latencyMsSubmit: t.latencyMsSubmit,
          charCount: t.charCount ?? 0,
        })),
      stylometry,
    );

    // Post-interview reconciliation: which resume claims did the conversation
    // actually fail to support?
    const demonstrated = assessment.tags
      .filter((t) => t.status === "demonstrated" || t.status === "contradicted")
      .map((t) => ({ label: t.label, confidence: t.status === "contradicted" ? 0 : t.confidence }));

    const reconciled = reconcileWithInterview(
      resume,
      demonstrated,
      assessment.resumeDeltas
        .filter((d) => d.direction === "undercut")
        .map((d) => ({ claim: d.claim, supported: false, note: d.detail })),
    );

    await db.$transaction(async (tx) => {
      await tx.assessment.create({
        data: {
          interviewId: interview.id,
          criteriaSetId: interview.criteriaSetId,
          overallScore: assessment.overallScore,
          recommendation: assessment.recommendation,
          summary: assessment.summary,
          competenciesCounted: assessment.overall.counted,
          competenciesTotal: assessment.overall.total,
          competencies: writeJson(competencyScores),
          strengths: writeJson(assessment.strengths),
          concerns: writeJson(assessment.concerns),
          integrity: writeJson(integrity),
          resumeDeltas: writeJson(assessment.resumeDeltas),
          // Rows as well as the JSON blob: the candidate list ranks and filters
          // on per-competency scores, and JSON is not queryable.
          scores: {
            create: assessment.scored.map((s) => ({
              competencyKey: s.competencyKey,
              label: s.label,
              score: s.score,
              confidence: s.confidence,
              evidenceQuote: s.evidenceQuote,
              note: s.note,
              source: s.source,
              reached: s.reached,
            })),
          },
        },
      });

      await tx.interview.update({
        where: { id: interview.id },
        data: { status: "completed", completedAt: new Date() },
      });

      if (reconciled.length) {
        await tx.verificationFinding.createMany({
          data: reconciled.map((f) => ({
            resumeId: interview.resumeId,
            kind: f.kind,
            severity: f.severity,
            field: f.field ?? null,
            detail: f.detail,
            evidence: f.evidence ? writeJson(f.evidence) : null,
          })),
        });
      }
    });

    // Tags are upserted outside the transaction: SQLite serialises writes, and a
    // long upsert loop inside a transaction is the classic way to hit a busy
    // timeout. Losing a tag is recoverable; losing the assessment is not.
    for (const tag of assessment.tags) {
      const label = tag.label.trim();
      if (!label) continue;
      const row = await db.tag.upsert({
        where: { label },
        create: { label, kind: tag.kind },
        update: {},
      });
      await db.candidateTag.upsert({
        where: { candidateId_tagId: { candidateId: interview.candidateId, tagId: row.id } },
        create: {
          candidateId: interview.candidateId,
          tagId: row.id,
          confidence: tag.confidence,
          status: tag.status,
          evidence: tag.evidence || null,
        },
        // A later interview that actually demonstrates a skill should overwrite
        // an earlier resume-only claim, but not the reverse.
        update:
          tag.status === "demonstrated"
            ? { confidence: tag.confidence, status: tag.status, evidence: tag.evidence || null }
            : {},
      });
    }

    const searchText = buildSearchText({
      headline: resume.headline,
      summary: assessment.summary,
      roleTitle: interview.roleTitle,
      sector: interview.sector,
      seniority: interview.seniority,
      tags: assessment.tags,
      competencies: competencyScores,
    });

    const embedding = await embed(searchText);

    const profileFields = {
      headline: resume.headline,
      sector: interview.sector,
      roleSlug: interview.roleSlug,
      roleTitle: interview.roleTitle,
      seniority: interview.seniority,
      yearsExperience: resume.totalYearsExperience,
      overallScore: assessment.overallScore,
      recommendation: assessment.recommendation,
      summary: assessment.summary,
      searchText,
      embedding: writeJson(embedding),
      competencies: writeJson(competencyScores),
    };

    await db.candidateProfile.upsert({
      where: { candidateId: interview.candidateId },
      create: { candidateId: interview.candidateId, ...profileFields },
      update: profileFields,
    });

    return NextResponse.json({
      ok: true,
      candidateId: interview.candidateId,
      overallScore: assessment.overallScore,
      recommendation: assessment.recommendation,
      competenciesCounted: assessment.overall.counted,
      competenciesTotal: assessment.overall.total,
      scoreExplanation: assessment.scoreExplanation,
    });
  } catch (error) {
    const { status, message, retryable } = describeApiError(error);
    return NextResponse.json({ error: message, retryable }, { status });
  }
}
