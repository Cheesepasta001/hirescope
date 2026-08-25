import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { claude, MODEL, EFFORT, parseWithRetry } from "@/lib/claude";
import type { ExtractedResume } from "@/lib/resume/schema";
import { planCompetencies, type InterviewPlan } from "@/lib/interview/plan";
import type { Competency } from "@/lib/interview/sectors";
import type { CompetencyScore } from "@/lib/assess/score";

/**
 * Homework generation.
 *
 * What this is for: an interview is a sample, and it always leaves competencies
 * untested or thinly evidenced. Homework targets exactly those, so the final
 * score rests on more of the standard rather than on a longer conversation.
 *
 * What it is not for: raising the bar. A candidate who covered everything well
 * gets a short task, and the task is never a substitute for evidence the
 * interview already produced.
 *
 * Two rules the prompt enforces hard, because both are ways this feature goes
 * wrong in practice:
 *
 *   - Under an hour, and no unpaid production work. A task that asks a
 *     candidate to build something the company would otherwise pay for is
 *     extracting labour from applicants, and a task that takes a weekend
 *     silently filters for people with a free weekend.
 *   - Written from the criteria file's own competency text. The homework is
 *     part of the assessment standard, and the standard is not ours to extend.
 */

const HOMEWORK_MIN_MINUTES = 15;
export const HOMEWORK_MAX_MINUTES = 60;

/** Below this confidence, interview evidence is treated as thin enough to re-test. */
const THIN_CONFIDENCE = new Set(["low"]);

const HomeworkGenSchema = z.object({
  title: z.string().describe("Six words or fewer. Names the task, not the competency."),
  brief: z.string().describe(
    "The task exactly as the candidate reads it. Markdown. Give them a concrete "
    + "scenario, say what to produce, and say what you are NOT looking for so they "
    + "do not gold-plate it. Address the candidate directly as 'you'. Do not mention "
    + "competency ids, scores, or that the interview left gaps.",
  ),
  rationale: z.string().describe(
    "One or two sentences, shown to the candidate, on why they are being asked this. "
    + "Honest and plain: which parts of their background this gives them a chance to "
    + "show. Never phrased as a deficiency.",
  ),
  estimatedMinutes: z.number().describe(
    `Realistic minutes for a competent candidate. Must be between ${HOMEWORK_MIN_MINUTES} `
    + `and ${HOMEWORK_MAX_MINUTES}. If the task cannot be done in that time, make it smaller.`,
  ),
  expectations: z.array(
    z.object({
      competencyId: z.string().describe("One of the target competency ids."),
      lookFor: z.string().describe(
        "What a strong submission shows for this competency, phrased so a grader "
        + "could point at the text and say where. Derived from the criteria file's "
        + "own strong-answer text, applied to this specific task.",
      ),
      weakSigns: z.string().describe(
        "What a weak submission looks like here. Derived from the criteria file's "
        + "own weak-answer text.",
      ),
    }),
  ).describe("Exactly one entry per target competency."),
});

export type GeneratedHomework = z.infer<typeof HomeworkGenSchema>;

export type HomeworkTargets = {
  competencies: Competency[];
  /** Why each was chosen, for the audit record. */
  reasons: Record<string, "unreached" | "thin_evidence">;
};

/**
 * Pick what the homework should test.
 *
 * Deterministic on purpose. Which competencies need more evidence is a fact
 * about the interview that was just conducted, not a judgement call, and
 * handing it to the model would make the choice unauditable for no benefit.
 */
export function chooseTargets(
  plan: InterviewPlan,
  scores: CompetencyScore[],
  max = 3,
): HomeworkTargets {
  const competencies = planCompetencies(plan);
  const byKey = new Map(scores.map((s) => [s.competencyId, s]));
  const reasons: Record<string, "unreached" | "thin_evidence"> = {};

  const ranked = competencies
    .map((c) => {
      const s = byKey.get(c.id);
      const unreached = !s || s.reached === false;
      const thin = Boolean(s && s.reached !== false && THIN_CONFIDENCE.has(s.confidence));
      if (!unreached && !thin) return null;
      reasons[c.id] = unreached ? "unreached" : "thin_evidence";
      return {
        competency: c,
        // Unreached first, then by how much the competency is worth.
        rank: (unreached ? 0 : 1) + (c.priority === "high" ? 0 : c.priority === "medium" ? 0.1 : 0.2),
      };
    })
    .filter((x): x is { competency: Competency; rank: number } => x !== null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, max);

  // An interview that covered everything well still gets a task, aimed at the
  // highest-priority competencies. Skipping homework for strong candidates
  // would mean the strongest applicants are assessed on less evidence than the
  // weakest, which is precisely backwards.
  if (ranked.length === 0) {
    const fallback = [...competencies]
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
      .slice(0, Math.min(2, competencies.length));
    for (const c of fallback) reasons[c.id] = "thin_evidence";
    return { competencies: fallback, reasons };
  }

  return { competencies: ranked.map((r) => r.competency), reasons };
}

function priorityRank(priority: string): number {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
}

const SYSTEM = `You are writing a short practical task for a job candidate who has
just finished an interview.

## What the task is for

The interview could not test everything. This task exists to give the candidate a
chance to show the competencies it missed. It is not a second hurdle, not a test
of stamina, and not a filter.

## Hard limits

Under an hour of real work. If your task would take longer, make it smaller —
cut the scope, not the specificity.

Never ask for work the company would otherwise pay someone to do. No "design our
onboarding flow", no "write a plan for our product", no "review our code". Use a
neutral, clearly fictional scenario.

Never require paid tools, a particular software stack, a login, or anything the
candidate might not have. It must be completable in a text box.

Never ask for anything that reveals age, nationality, family circumstances,
health, religion, or any proxy for them. No "describe your career journey".

## What makes a good task

Ask for a decision and its reasoning, not for volume. The best tasks put the
candidate in a specific situation with incomplete information and ask what they
would do and why — because that is expensive to fake and cheap to do honestly if
you have actually done the work.

Give them permission to be brief. State what you are not looking for. A candidate
who spends four hours on a thirty-minute task has been failed by the task.

Score nothing on presentation, formatting, or English fluency.`;

export async function generateHomework(args: {
  plan: InterviewPlan;
  resume: ExtractedResume;
  targets: HomeworkTargets;
  /** A short digest of the interview, so the task does not repeat what was covered. */
  interviewSummary: string;
}): Promise<GeneratedHomework> {
  const { plan, resume, targets, interviewSummary } = args;

  const response = await parseWithRetry(() =>
    claude.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system:
        `${SYSTEM}\n\n## Role\n${plan.seniority} ${plan.roleTitle}.\n\n`
        + `## The competencies this task must test\n\n`
        + `These come from the company's own criteria file. Write the task so that doing `
        + `it well requires demonstrating these, and write the expectations from this text `
        + `rather than from your own idea of what the competency means.\n\n`
        + targets.competencies
          .map(
            (c) =>
              `### ${c.id} — ${c.label}\n${c.description}\n`
              + `Strong: ${c.probes}\nWeak: ${c.weakSignals}`,
          )
          .join("\n\n")
        + `\n\nReturn exactly one expectations entry per id above.`,
      thinking: { type: "adaptive" },
      output_config: { effort: EFFORT.extraction, format: zodOutputFormat(HomeworkGenSchema) },
      messages: [
        {
          role: "user",
          content:
            `<candidate_background>\n${resume.headline}\n${resume.summary}\n`
            + `${resume.totalYearsExperience} years experience.\n`
            + `Recent roles: ${resume.employment.slice(0, 3).map((e) => `${e.title} at ${e.company}`).join("; ")}\n`
            + `</candidate_background>\n\n`
            + `<interview_already_covered>\n${interviewSummary}\n</interview_already_covered>\n\n`
            + `Write a task that gives this person a fair chance to show the competencies above. `
            + `Ground it in a scenario they would find familiar given their background, but do not `
            + `ask about their actual employer or their actual projects.`,
        },
      ],
    }),
  );

  if (!response.parsed_output) {
    throw new Error("Could not generate a homework task for this interview.");
  }

  const generated = response.parsed_output;

  // The time limit is a fairness constraint, so it is clamped here rather than
  // trusted to the prompt.
  return {
    ...generated,
    estimatedMinutes: Math.min(
      HOMEWORK_MAX_MINUTES,
      Math.max(HOMEWORK_MIN_MINUTES, Math.round(generated.estimatedMinutes)),
    ),
    // Expectations for competencies outside the target set would grade the
    // candidate on something the task never asked for.
    expectations: generated.expectations.filter((e) =>
      targets.competencies.some((c) => c.id === e.competencyId),
    ),
  };
}
