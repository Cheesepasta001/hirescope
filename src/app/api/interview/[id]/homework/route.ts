import { NextResponse } from "next/server";
import { db, readJson, writeJson } from "@/lib/db";
import { describeApiError } from "@/lib/claude";
import { planCompetencies, type InterviewPlan } from "@/lib/interview/plan";
import type { ExtractedResume } from "@/lib/resume/schema";
import type { CompetencyScore } from "@/lib/assess/score";
import { recomputeAssessment } from "@/lib/assess/recompute";
import {
  chooseTargets,
  generateHomework,
  type GeneratedHomework,
} from "@/lib/homework/generate";
import { gradeHomework, toHomeworkScores } from "@/lib/homework/grade";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_SUBMISSION_CHARS = 30_000;

/**
 * The homework task, generated on first read.
 *
 * Generation is lazy rather than part of the finish route for two reasons: the
 * finish route already makes the most expensive call in the app and does not
 * need another one bolted on, and a candidate who never opens the task should
 * not have cost anything to generate one.
 *
 * Authorised by the unguessable interview id, the same way the candidate's own
 * report is. That is adequate for a demo and not for production — see
 * /governance.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const interview = await db.interview.findUnique({
      where: { id },
      include: {
        resume: true,
        homework: { include: { submission: true } },
        assessment: { include: { scores: true } },
        turns: { orderBy: { idx: "asc" } },
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found." }, { status: 404 });
    }

    if (interview.homework) return NextResponse.json(present(interview.homework));

    // Homework is generated from the assessment's coverage, so it needs one.
    if (!interview.assessment) {
      return NextResponse.json(
        { error: "Finish the interview first — the task is built from what it did not cover." },
        { status: 409 },
      );
    }

    const plan = readJson<InterviewPlan | null>(interview.plan, null);
    const resume = readJson<ExtractedResume | null>(interview.resume.extracted, null);
    if (!plan || !resume) {
      return NextResponse.json(
        { error: "This interview is missing its plan or resume data." },
        { status: 500 },
      );
    }

    const existingScores: CompetencyScore[] = interview.assessment.scores.map((s) => ({
      competencyId: s.competencyKey,
      label: s.label,
      score: s.score,
      priority: "medium",
      confidence: s.confidence as "low" | "medium" | "high",
      reached: s.reached,
      evidence: s.evidenceQuote,
      note: s.note,
      source: s.source as "interview" | "homework",
    }));

    const targets = chooseTargets(plan, existingScores);

    const generated = await generateHomework({
      plan,
      resume,
      targets,
      interviewSummary: interview.turns
        .filter((t) => t.role === "interviewer")
        .map((t) => `- [${t.competency ?? "general"}] ${t.text}`)
        .join("\n"),
    });

    const homework = await db.homework.create({
      data: {
        interviewId: interview.id,
        criteriaSetId: interview.criteriaSetId,
        title: generated.title,
        brief: generated.brief,
        rationale: generated.rationale,
        targetKeys: writeJson(targets.competencies.map((c) => c.id)),
        expectations: writeJson({
          expectations: generated.expectations,
          // Why each competency was chosen, kept for the audit record.
          reasons: targets.reasons,
        }),
        estimatedMinutes: generated.estimatedMinutes,
      },
      include: { submission: true },
    });

    return NextResponse.json(present(homework));
  } catch (error) {
    const { status, message, retryable } = describeApiError(error);
    return NextResponse.json({ error: message, retryable }, { status });
  }
}

/** Submit the task, grade it, and fold the result into the overall score. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as { text?: string; pasteCount?: number };

    const text = (body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Write something before submitting." }, { status: 400 });
    }
    if (text.length > MAX_SUBMISSION_CHARS) {
      return NextResponse.json({ error: "That submission is too long." }, { status: 400 });
    }

    const interview = await db.interview.findUnique({
      where: { id },
      include: {
        homework: { include: { submission: true } },
        assessment: true,
      },
    });

    if (!interview?.homework) {
      return NextResponse.json({ error: "There is no task for this interview." }, { status: 404 });
    }
    if (interview.homework.submission) {
      return NextResponse.json(
        { error: "This task has already been submitted." },
        { status: 409 },
      );
    }
    if (!interview.assessment) {
      return NextResponse.json({ error: "This interview has no assessment." }, { status: 409 });
    }

    const plan = readJson<InterviewPlan | null>(interview.plan, null);
    if (!plan) {
      return NextResponse.json({ error: "This interview is missing its plan." }, { status: 500 });
    }

    // Written before grading, so a grading failure costs a retry rather than
    // the candidate's work — the same rule the interview turn route follows.
    const submission = await db.homeworkSubmission.create({
      data: {
        homeworkId: interview.homework.id,
        text,
        charCount: text.length,
        pasteCount: Math.max(0, Math.min(999, Math.round(body.pasteCount ?? 0))),
      },
    });

    const targetKeys = readJson<string[]>(interview.homework.targetKeys, []);
    const competencies = planCompetencies(plan).filter((c) => targetKeys.includes(c.id));
    const stored = readJson<{ expectations: GeneratedHomework["expectations"] }>(
      interview.homework.expectations,
      { expectations: [] },
    );

    const grade = await gradeHomework({
      homework: {
        title: interview.homework.title,
        brief: interview.homework.brief,
        rationale: interview.homework.rationale,
        estimatedMinutes: interview.homework.estimatedMinutes,
        expectations: stored.expectations,
      },
      targets: competencies,
      submission: text,
      roleTitle: interview.roleTitle,
      seniority: interview.seniority,
    });

    const scores = toHomeworkScores(grade, competencies);

    // Upsert rather than create: a re-grade must not collide with the row from
    // a previous attempt.
    for (const s of scores) {
      await db.competencyScore.upsert({
        where: {
          assessmentId_competencyKey_source: {
            assessmentId: interview.assessment.id,
            competencyKey: s.competencyKey,
            source: "homework",
          },
        },
        create: {
          assessmentId: interview.assessment.id,
          competencyKey: s.competencyKey,
          label: s.label,
          score: s.score,
          confidence: s.confidence,
          evidenceQuote: s.evidenceQuote,
          note: s.note,
          source: "homework",
          reached: s.reached,
        },
        update: {
          score: s.score,
          confidence: s.confidence,
          evidenceQuote: s.evidenceQuote,
          note: s.note,
          reached: s.reached,
        },
      });
    }

    await db.homeworkSubmission.update({
      where: { id: submission.id },
      data: { gradedAt: new Date(), graderNote: grade.overallNote },
    });

    // One path for the overall score, whatever fed it.
    const overall = await recomputeAssessment(interview.assessment.id);

    return NextResponse.json({
      ok: true,
      graded: true,
      overallScore: overall?.overall ?? null,
      competenciesCounted: overall?.counted ?? null,
      competenciesTotal: overall?.total ?? null,
      note: grade.overallNote,
      scores: scores.map((s) => ({
        competencyKey: s.competencyKey,
        label: s.label,
        score: s.score,
        reached: s.reached,
        confidence: s.confidence,
        note: s.note,
      })),
    });
  } catch (error) {
    const { status, message, retryable } = describeApiError(error);
    return NextResponse.json({ error: message, retryable }, { status });
  }
}

type HomeworkRow = {
  id: string;
  title: string;
  brief: string;
  rationale: string;
  targetKeys: string;
  estimatedMinutes: number;
  createdAt: Date;
  submission: { submittedAt: Date; gradedAt: Date | null; graderNote: string | null } | null;
};

/**
 * What the candidate sees. Deliberately excludes `expectations` — that is the
 * grading rubric, and handing it over turns the task into a fill-in exercise.
 */
function present(homework: HomeworkRow) {
  return {
    id: homework.id,
    title: homework.title,
    brief: homework.brief,
    rationale: homework.rationale,
    estimatedMinutes: homework.estimatedMinutes,
    competencyCount: readJson<string[]>(homework.targetKeys, []).length,
    createdAt: homework.createdAt,
    submitted: Boolean(homework.submission),
    submittedAt: homework.submission?.submittedAt ?? null,
    graded: Boolean(homework.submission?.gradedAt),
  };
}
