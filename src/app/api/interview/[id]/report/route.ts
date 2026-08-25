import { NextResponse } from "next/server";
import { db, readJson } from "@/lib/db";
import type { CompetencyScore } from "@/lib/assess/score";
import { explainOverall, weightFor } from "@/lib/assess/scoring";
import type { IntegrityReport } from "@/lib/integrity/signals";
import type { InterviewPlan } from "@/lib/interview/plan";
import { chooseTargets } from "@/lib/homework/generate";

export const runtime = "nodejs";

/**
 * The candidate's own copy of their assessment.
 *
 * Candidates being able to see what was said about them is not a nicety: GDPR
 * Art. 15 gives a right of access and Art. 22 a right to contest automated
 * decisions, Illinois AIVIA requires disclosure for AI-analysed interviews, and
 * NYC Local Law 144 requires notice. Building the candidate view at the same
 * time as the manager view is the only way it stays truthful — a report you know
 * the subject will read is a report you write more carefully.
 *
 * Auth here is the unguessable interview id. That is adequate for a demo and not
 * for production: issue a signed, expiring link tied to the candidate's email.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const interview = await db.interview.findUnique({
    where: { id },
    include: {
      assessment: true,
      candidate: { select: { name: true } },
      resume: { include: { findings: { where: { candidateVisible: true } } } },
      homework: { include: { submission: { select: { submittedAt: true } } } },
    },
  });

  if (!interview) return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  if (!interview.assessment) {
    return NextResponse.json({ status: interview.status, ready: false });
  }

  const a = interview.assessment;
  const integrity = readJson<IntegrityReport | null>(a.integrity, null);
  const competencies = readJson<CompetencyScore[]>(a.competencies, []);

  // The task is generated only when the candidate opens it, so before then its
  // shape is derived here from the same deterministic target choice the
  // generator uses. That lets the page describe the task honestly without
  // spending a model call on someone who may never click.
  const plan = readJson<InterviewPlan | null>(interview.plan, null);
  const targetCount = plan ? chooseTargets(plan, competencies).competencies.length : 0;

  return NextResponse.json({
    ready: true,
    name: interview.candidate.name,
    roleTitle: interview.roleTitle,
    overallScore: a.overallScore,
    recommendation: a.recommendation,
    summary: a.summary,
    // The candidate sees the same arithmetic the manager does.
    scoreExplanation: explainOverall({
      overall: a.overallScore,
      counted: a.competenciesCounted,
      total: a.competenciesTotal || competencies.length,
      weightSum: competencies
        .filter((c) => c.reached !== false)
        .reduce((sum, c) => sum + weightFor(c.priority), 0),
      unreached: competencies.filter((c) => c.reached === false).map((c) => c.competencyId),
    }),
    homework: interview.homework
      ? {
          generated: true,
          estimatedMinutes: interview.homework.estimatedMinutes,
          competencyCount: readJson<string[]>(interview.homework.targetKeys, []).length,
          submitted: Boolean(interview.homework.submission),
        }
      : targetCount > 0
        ? { generated: false, estimatedMinutes: null, competencyCount: targetCount, submitted: false }
        : null,
    competencies,
    strengths: readJson<string[]>(a.strengths, []),
    concerns: readJson<string[]>(a.concerns, []),
    // Candidates see what was flagged about their resume so they can correct it.
    findings: interview.resume.findings.map((f) => ({
      id: f.id,
      kind: f.kind,
      severity: f.severity,
      detail: f.detail,
      response: f.candidateResponse,
    })),
    // The integrity band and its caveat, without the internal weightings.
    integrity: integrity
      ? { band: integrity.band, observations: integrity.observations.map((o) => o.label), caveat: integrity.caveat }
      : null,
  });
}

/** Let a candidate attach a rebuttal to a verification finding. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json()) as { findingId?: string; response?: string };

  if (!body.findingId || !body.response?.trim()) {
    return NextResponse.json({ error: "A finding and a response are required." }, { status: 400 });
  }

  const finding = await db.verificationFinding.findUnique({
    where: { id: body.findingId },
    include: { resume: { include: { interviews: { select: { id: true } } } } },
  });

  if (!finding || !finding.resume.interviews.some((i) => i.id === id)) {
    return NextResponse.json({ error: "Finding not found." }, { status: 404 });
  }

  await db.verificationFinding.update({
    where: { id: body.findingId },
    data: { candidateResponse: body.response.trim().slice(0, 2000) },
  });

  return NextResponse.json({ ok: true });
}
