import { NextResponse } from "next/server";
import { db, readJson } from "@/lib/db";
import type { CompetencyScore } from "@/lib/assess/score";
import { explainOverall, weightFor } from "@/lib/assess/scoring";
import type { IntegrityReport } from "@/lib/integrity/signals";

export const runtime = "nodejs";

/** The full candidate report a manager reads before deciding anything. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const passcode = new URL(request.url).searchParams.get("passcode");
  if (passcode !== (process.env.MANAGER_PASSCODE ?? "letmein")) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  const candidate = await db.candidate.findUnique({
    where: { id },
    include: {
      profile: true,
      tags: { include: { tag: true } },
      resumes: { orderBy: { createdAt: "desc" }, take: 1, include: { findings: true } },
      interviews: {
        orderBy: { startedAt: "desc" },
        include: {
          assessment: { include: { scores: true } },
          turns: { orderBy: { idx: "asc" } },
          // The standard this interview was actually held to, which is not
          // necessarily what the criteria file says today.
          criteriaSet: { include: { competencies: { orderBy: { orderIndex: "asc" } } } },
        },
      },
    },
  });

  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });

  const latest = candidate.interviews.find((i) => i.assessment);
  if (!latest?.assessment) {
    return NextResponse.json({ error: "This candidate has no completed interview yet." }, { status: 404 });
  }

  const a = latest.assessment;

  // Score rows are authoritative; the JSON blob on the assessment is a copy kept
  // for readers that only load the assessment. Prefer the rows, fall back for
  // records written before the rows existed.
  const priorityByKey = new Map(
    (latest.criteriaSet?.competencies ?? []).map((c) => [c.key, c.priority]),
  );
  const competencies: CompetencyScore[] = a.scores.length
    ? a.scores.map((s) => ({
        competencyId: s.competencyKey,
        label: s.label,
        score: s.score,
        priority: priorityByKey.get(s.competencyKey) ?? "medium",
        confidence: s.confidence as "low" | "medium" | "high",
        reached: s.reached,
        evidence: s.evidenceQuote,
        note: s.note,
        source: s.source as "interview" | "homework",
      }))
    : readJson<CompetencyScore[]>(a.competencies, []);

  return NextResponse.json({
    candidate: {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      headline: candidate.profile?.headline ?? "",
      yearsExperience: candidate.profile?.yearsExperience ?? 0,
      consent: {
        interview: candidate.consentInterview,
        recording: candidate.consentRecording,
        linkCheck: candidate.consentLinkCheck,
        at: candidate.consentedAt,
        policyVersion: candidate.consentPolicyVer,
      },
    },
    interview: {
      id: latest.id,
      roleTitle: latest.roleTitle,
      roleSlug: latest.roleSlug,
      sector: latest.sector,
      seniority: latest.seniority,
      startedAt: latest.startedAt,
      completedAt: latest.completedAt,
      questionCount: latest.turns.filter((t) => t.role === "interviewer").length,
    },
    // Which version of the standard this person was held to. Kept separate from
    // the criteria file's current contents on purpose — the file may have moved.
    criteria: latest.criteriaSet
      ? {
          roleSlug: latest.criteriaSet.roleSlug,
          roleTitle: latest.criteriaSet.roleTitle,
          version: latest.criteriaSet.version,
          sourcePath: latest.criteriaSet.sourcePath,
          parsedAt: latest.criteriaSet.parsedAt,
          competencyCount: latest.criteriaSet.competencies.length,
        }
      : null,
    assessment: {
      overallScore: a.overallScore,
      recommendation: a.recommendation,
      summary: a.summary,
      competenciesCounted: a.competenciesCounted,
      competenciesTotal: a.competenciesTotal || competencies.length,
      scoreExplanation: explainOverall({
        overall: a.overallScore,
        counted: a.competenciesCounted,
        total: a.competenciesTotal || competencies.length,
        weightSum: competencies
          .filter((c) => c.reached !== false)
          .reduce((sum, c) => sum + weightFor(c.priority), 0),
        unreached: competencies.filter((c) => c.reached === false).map((c) => c.competencyId),
      }),
      competencies,
      strengths: readJson<string[]>(a.strengths, []),
      concerns: readJson<string[]>(a.concerns, []),
      resumeDeltas: readJson<{ claim: string; direction: string; detail: string }[]>(a.resumeDeltas, []),
    },
    integrity: readJson<IntegrityReport | null>(a.integrity, null),
    tags: candidate.tags
      .map((ct) => ({
        label: ct.tag.label,
        kind: ct.tag.kind,
        confidence: ct.confidence,
        status: ct.status,
        evidence: ct.evidence,
      }))
      .sort((x, y) => y.confidence - x.confidence),
    verification: (candidate.resumes[0]?.findings ?? []).map((f) => ({
      kind: f.kind,
      severity: f.severity,
      field: f.field,
      detail: f.detail,
      candidateResponse: f.candidateResponse,
    })),
    transcript: latest.turns.map((t) => ({
      role: t.role,
      text: t.text,
      competency: t.competency,
      questionType: t.questionType,
    })),
  });
}
