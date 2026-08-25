import { NextResponse } from "next/server";
import { db, readJson } from "@/lib/db";
import type { CompetencyScore } from "@/lib/assess/score";
import { listRoles } from "@/lib/criteria/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The candidate list: everyone with a completed assessment, ranked by overall
 * score.
 *
 * Ranking is the only relative judgement in the system. A candidate's own
 * recommendation stays absolute — derived from their evidence alone — because a
 * verdict that changed because somebody else applied would be indefensible to
 * the person it was applied to.
 *
 * Nothing is hidden on the basis of a score. Filters exist because a manager
 * hiring for one role does not want to read six, but the default is everyone,
 * and a filtered-out candidate is reported as filtered out rather than dropped
 * silently.
 *
 * POST rather than GET, with the passcode in the body: a passcode in a query
 * string ends up in server logs and browser history.
 */

const MAX_LIMIT = 200;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    passcode?: string;
    roleSlug?: string;
    seniority?: string;
    minScore?: number;
    recommendation?: string;
    limit?: number;
  };

  if (body.passcode !== (process.env.MANAGER_PASSCODE ?? "letmein")) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  const where = {
    ...(body.roleSlug ? { roleSlug: body.roleSlug } : {}),
    ...(body.seniority ? { seniority: body.seniority } : {}),
    ...(body.recommendation ? { recommendation: body.recommendation } : {}),
    ...(body.minScore ? { overallScore: { gte: Math.round(body.minScore) } } : {}),
  };

  const [profiles, totalUnfiltered, roles] = await Promise.all([
    db.candidateProfile.findMany({
      where,
      // The team's stated rule: rank by overall score.
      orderBy: [{ overallScore: "desc" }, { updatedAt: "desc" }],
      take: Math.min(MAX_LIMIT, Math.max(1, body.limit ?? 100)),
      include: {
        candidate: {
          select: {
            id: true, name: true, email: true, phone: true, location: true,
            interviews: {
              where: { status: "completed" },
              orderBy: { completedAt: "desc" },
              take: 1,
              select: {
                completedAt: true,
                assessment: {
                  select: { competenciesCounted: true, competenciesTotal: true },
                },
              },
            },
          },
        },
      },
    }),
    db.candidateProfile.count(),
    listRoles(),
  ]);

  const candidates = profiles.map((p) => {
    const latest = p.candidate.interviews[0];
    return {
      candidateId: p.candidateId,
      name: p.candidate.name,
      headline: p.headline,
      roleSlug: p.roleSlug,
      roleTitle: p.roleTitle || p.sector,
      sector: p.sector,
      seniority: p.seniority,
      yearsExperience: p.yearsExperience,
      overallScore: p.overallScore,
      recommendation: p.recommendation,
      competenciesCounted: latest?.assessment?.competenciesCounted ?? 0,
      competenciesTotal: latest?.assessment?.competenciesTotal ?? 0,
      competencies: readJson<CompetencyScore[]>(p.competencies, []),
      contact: {
        email: p.candidate.email,
        phone: p.candidate.phone,
        location: p.candidate.location,
      },
      assessedAt: latest?.completedAt ?? p.updatedAt,
    };
  });

  return NextResponse.json({
    candidates,
    shown: candidates.length,
    // So the UI can say "12 of 40" rather than implying the filter is the world.
    totalUnfiltered,
    roles: roles
      .filter((r) => !r.error)
      .map((r) => ({ roleSlug: r.roleSlug, roleTitle: r.roleTitle })),
  });
}
