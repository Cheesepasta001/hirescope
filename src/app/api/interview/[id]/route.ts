import { NextResponse } from "next/server";
import { db, readJson } from "@/lib/db";
import type { InterviewPlan } from "@/lib/interview/plan";

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

  return NextResponse.json({
    id: interview.id,
    status: interview.status,
    candidateName: interview.candidate.name,
    roleTitle: interview.roleTitle,
    seniority: interview.seniority,
    questionsAsked: asked,
    questionBudget: plan?.questionBudget ?? 12,
    candidateId: interview.candidateId,
    turns: interview.turns.map((t) => ({
      role: t.role,
      text: t.text,
      questionType: t.questionType,
    })),
  });
}
