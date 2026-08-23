import { NextResponse } from "next/server";
import { db, readJson } from "@/lib/db";
import type { CompetencyScore } from "@/lib/assess/score";
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
        include: { assessment: true, turns: { orderBy: { idx: "asc" } } },
      },
    },
  });

  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });

  const latest = candidate.interviews.find((i) => i.assessment);
  if (!latest?.assessment) {
    return NextResponse.json({ error: "This candidate has no completed interview yet." }, { status: 404 });
  }

  const a = latest.assessment;

  return NextResponse.json({
    candidate: {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
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
      sector: latest.sector,
      seniority: latest.seniority,
      startedAt: latest.startedAt,
      completedAt: latest.completedAt,
      questionCount: latest.turns.filter((t) => t.role === "interviewer").length,
    },
    assessment: {
      overallScore: a.overallScore,
      recommendation: a.recommendation,
      summary: a.summary,
      competencies: readJson<CompetencyScore[]>(a.competencies, []),
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
