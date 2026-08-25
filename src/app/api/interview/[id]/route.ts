import { NextResponse } from "next/server";
import { db, readJson } from "@/lib/db";
import type { InterviewPlan } from "@/lib/interview/plan";
import {
  assessStaleness,
  markRetryOffered,
  discardAbandoned,
  RETRY_WINDOW_MS,
} from "@/lib/interview/abandonment";

export const runtime = "nodejs";

/** Current interview state, so a candidate can refresh or resume without losing progress. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const interview = await db.interview.findUnique({
    where: { id },
    include: {
      candidate: { select: { name: true } },
      turns: { orderBy: { idx: "asc" } },
    },
  });

  if (!interview) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  const plan = readJson<InterviewPlan | null>(interview.plan, null);
  const asked = interview.turns.filter((t) => t.role === "interviewer").length;

  // A candidate coming back to a session they walked away from gets one clear
  // choice: pick it up, or have it deleted. Loading the page is what starts the
  // retry clock, because offering a retry nobody saw would be a formality.
  const staleness = assessStaleness({
    status: interview.status,
    startedAt: interview.startedAt,
    lastTurnAt: interview.turns.at(-1)?.createdAt ?? null,
    retryOfferedAt: interview.retryOfferedAt,
  });

  let purgeAfter = staleness.purgeAfter;
  if (staleness.stale && !interview.retryOfferedAt) {
    const offeredAt = await markRetryOffered(interview.id);
    purgeAfter = new Date(offeredAt.getTime() + RETRY_WINDOW_MS);
  }

  return NextResponse.json({
    id: interview.id,
    status: interview.status,
    candidateName: interview.candidate.name,
    roleTitle: interview.roleTitle,
    seniority: interview.seniority,
    questionsAsked: asked,
    questionBudget: plan?.questionBudget ?? 12,
    candidateId: interview.candidateId,
    resumeOffered: staleness.stale,
    purgeAfter,
    turns: interview.turns.map((t) => ({
      role: t.role,
      text: t.text,
      questionType: t.questionType,
    })),
  });
}

/**
 * The candidate declining their retry. Deletes the abandoned attempt, and the
 * candidate with it when nothing of theirs was ever assessed.
 *
 * Only reachable for an in-progress interview: a completed one is a hiring
 * record, and discardAbandoned refuses it rather than trusting the caller.
 */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const result = await discardAbandoned(id);

  if (result.deleted === "nothing") {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }
  return NextResponse.json({ ok: true, deleted: result.deleted });
}
