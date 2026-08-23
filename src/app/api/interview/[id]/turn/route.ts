import { NextResponse } from "next/server";
import { db, readJson, writeJson } from "@/lib/db";
import { describeApiError } from "@/lib/claude";
import { nextTurn, type TurnRecord } from "@/lib/interview/engine";
import type { InterviewPlan } from "@/lib/interview/plan";
import type { ExtractedResume } from "@/lib/resume/schema";
import type { SectorId } from "@/lib/interview/sectors";
import { screenAnswer } from "@/lib/integrity/stylometry";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Submit an answer, get the next question. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      answer: string;
      latencyMsFirstKey?: number | null;
      latencyMsSubmit?: number | null;
    };

    const answer = (body.answer ?? "").trim();
    if (!answer) {
      return NextResponse.json({ error: "An answer is required." }, { status: 400 });
    }
    if (answer.length > 20_000) {
      return NextResponse.json({ error: "That answer is too long." }, { status: 400 });
    }

    const interview = await db.interview.findUnique({
      where: { id },
      include: {
        resume: true,
        turns: { orderBy: { idx: "asc" } },
        integrityEvents: true,
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found." }, { status: 404 });
    }
    if (interview.status !== "in_progress") {
      return NextResponse.json({ error: "This interview is already finished." }, { status: 409 });
    }

    const plan = readJson<InterviewPlan | null>(interview.plan, null);
    const resume = readJson<ExtractedResume | null>(interview.resume.extracted, null);
    if (!plan || !resume) {
      return NextResponse.json({ error: "This interview is missing its plan or resume data." }, { status: 500 });
    }

    const nextIdx = interview.turns.length;

    // Record the answer before calling the model, so a model failure never loses
    // what the candidate typed.
    const answerTurn = await db.turn.create({
      data: {
        interviewId: interview.id,
        idx: nextIdx,
        role: "candidate",
        text: answer,
        competency: interview.turns.at(-1)?.competency ?? null,
        latencyMsFirstKey: body.latencyMsFirstKey ?? null,
        latencyMsSubmit: body.latencyMsSubmit ?? null,
        charCount: answer.length,
      },
    });

    const history: TurnRecord[] = [
      ...interview.turns.map((t) => ({
        role: t.role as "interviewer" | "candidate",
        text: t.text,
        competency: t.competency,
        probeDepth: t.probeDepth,
      })),
      { role: "candidate" as const, text: answer },
    ];

    const questionsAsked = interview.turns.filter((t) => t.role === "interviewer").length;
    const budgetExhausted = questionsAsked >= plan.questionBudget;

    // Focus-loss counts are visible to the engine only as a nudge to probe more
    // deeply. They must never reach the scorer, which is why this string goes in
    // the turn request and not into the assessment call.
    const eventCounts = interview.integrityEvents.reduce<Record<string, number>>((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + 1;
      return acc;
    }, {});
    const integrityNote =
      (eventCounts.paste ?? 0) + (eventCounts.tab_hidden ?? 0) >= 3
        ? "Several answers followed the tab losing focus. Ask for one concrete, personal "
          + "detail this candidate could only know first-hand. Do not accuse or hint."
        : undefined;

    const turn = await nextTurn({
      plan,
      resume,
      sector: interview.sector as SectorId,
      turns: history,
      integrityNote,
    });

    await db.turn.update({
      where: { id: answerTurn.id },
      data: {
        appraisal: writeJson(turn.appraisal),
        competency: turn.appraisal.competencyId || answerTurn.competency,
      },
    });

    // Stylometry runs after the appraisal so it can compare against the register
    // of the candidate's earlier answers. It is best-effort: a failure here must
    // not break the interview.
    void (async () => {
      try {
        const priorAnswers = interview.turns
          .filter((t) => t.role === "candidate")
          .map((t) => t.text);
        const lastQuestion = interview.turns.at(-1)?.text ?? "";
        const result = await screenAnswer({ answer, question: lastQuestion, priorAnswers });
        if (result) {
          await db.turn.update({
            where: { id: answerTurn.id },
            data: { stylometry: writeJson(result) },
          });
        }
      } catch {
        // Intentionally silent — an integrity heuristic is not worth an error toast.
      }
    })();

    const isClosing = turn.decision.action === "closing" || budgetExhausted;

    const questionTurn = await db.turn.create({
      data: {
        interviewId: interview.id,
        idx: nextIdx + 1,
        role: "interviewer",
        text: turn.question.text,
        competency: turn.question.competencyId,
        questionType: isClosing ? "closing" : turn.question.questionType,
        probeDepth: turn.question.probeDepth,
      },
    });

    return NextResponse.json({
      question: questionTurn.text,
      questionType: questionTurn.questionType,
      competency: questionTurn.competency,
      questionsAsked: questionsAsked + 1,
      questionBudget: plan.questionBudget,
      isFinalQuestion: isClosing,
    });
  } catch (error) {
    const { status, message } = describeApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
