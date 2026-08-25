import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { claude, MODEL, EFFORT, parseWithRetry } from "@/lib/claude";
import type { ExtractedResume } from "@/lib/resume/schema";
import type { ResolvedCriteria } from "@/lib/criteria/load";
import { competenciesFor, sectorLabel, type Competency } from "./sectors";

/**
 * The plan is fixed at the start of the interview and never regenerated. That
 * matters for three reasons: the candidate gets a consistent experience, the
 * plan is the audit record of what the interview intended to assess (which is
 * what a bias audit under NYC Local Law 144 actually needs to inspect), and it
 * carries a frozen copy of the criteria so HR editing the file mid-interview
 * cannot change the standard under a candidate who has already started.
 */

const PlanGenSchema = z.object({
  openingQuestion: z.string().describe(
    "The first question. Warm but substantive, anchored in something specific "
    + "from their most recent role. Not 'tell me about yourself'.",
  ),
  resumeProbes: z.array(
    z.object({
      claim: z.string().describe("The specific resume claim being probed."),
      whereFrom: z.string().describe("Role or section it came from."),
      angle: z.string().describe(
        "How to test it: what a person who actually did this would know that "
        + "someone who padded the bullet would not.",
      ),
      competencyId: z.string().describe("Which competency id this probe serves."),
      priority: z.number().describe("1 is highest. Use 1-3."),
    }),
  ).describe("Between 3 and 6 probes. Prioritise claims that are load-bearing for the role."),
  focusRationale: z.string().describe(
    "Two sentences on where this interview should spend its time, given this "
    + "resume and this role.",
  ),
});

/**
 * The criteria snapshot carried inside the plan. Everything the engine and the
 * scorer need, so neither has to re-read the file or hit the database mid-run.
 */
export type PlanCriteria = {
  criteriaSetId: string;
  roleSlug: string;
  roleTitle: string;
  sector: string;
  version: number;
  sourcePath: string;
  sourceHash: string;
  competencies: Competency[];
};

export type InterviewPlan = {
  criteria: PlanCriteria;
  /** Kept at the top level too, because a lot of call sites only want these. */
  sector: string;
  roleTitle: string;
  seniority: string;
  questionBudget: number;
  targets: { competencyId: string; label: string; targetQuestions: number }[];
  resumeProbes: z.infer<typeof PlanGenSchema>["resumeProbes"];
  openingQuestion: string;
  focusRationale: string;
  createdAt: string;
};

/**
 * Question budget by seniority. Senior candidates get more questions because the
 * variance that matters is in depth of judgement, which takes longer to surface.
 */
const BUDGET: Record<string, number> = { junior: 10, mid: 12, senior: 14, lead: 15 };

/**
 * How many questions each competency is targeted for, by its priority in the
 * criteria file. High-priority competencies get two because one question rarely
 * separates a rehearsed answer from a real one.
 */
const QUESTIONS_BY_PRIORITY: Record<string, number> = { high: 2, medium: 1, low: 1 };

export async function buildPlan(
  resume: ExtractedResume,
  criteria: ResolvedCriteria,
  seniority: string,
): Promise<InterviewPlan> {
  const competencies = competenciesFor(criteria);
  const questionBudget = BUDGET[seniority] ?? 12;

  const targets = competencies.map((c) => ({
    competencyId: c.id,
    label: c.label,
    targetQuestions: QUESTIONS_BY_PRIORITY[c.priority] ?? 1,
  }));

  const response = await parseWithRetry(() =>
    claude.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system:
        `You are designing an interview plan for a ${seniority} ${criteria.roleTitle} role in `
        + `${sectorLabel(criteria.sector)}.\n\n`
        + `The competencies below are the company's own hiring standard, written by their `
        + `HR team. They are fixed. Do not invent competencies, do not merge them, and do `
        + `not substitute your own idea of what matters for this role.\n\n`
        + `Available competency ids: ${competencies.map((c) => c.id).join(", ")}.\n\n`
        + competencies
          .map((c) => `- ${c.id} (${c.label}, priority ${c.priority}): ${c.description}`)
          .join("\n")
        + `\n\nDesign probes that would separate someone who genuinely did the work from `
        + `someone who wrote a good bullet point about it. The best probes ask for a `
        + `specific decision, a specific number, or a specific failure — details that `
        + `are cheap to recall if you were there and expensive to fabricate if you were not.\n\n`
        + `Weight your probes toward the high-priority competencies.\n\n`
        + `Never build a probe around age, gender, nationality, ethnicity, religion, `
        + `health, disability, family status, or any proxy for them (graduation year, `
        + `military service, career gaps for caregiving). Probe the work, not the person.`,
      thinking: { type: "adaptive" },
      output_config: { effort: EFFORT.extraction, format: zodOutputFormat(PlanGenSchema) },
      messages: [
        {
          role: "user",
          content:
            `Resume, already structured:\n\n${JSON.stringify(
              {
                headline: resume.headline,
                summary: resume.summary,
                totalYearsExperience: resume.totalYearsExperience,
                employment: resume.employment,
                education: resume.education,
                skills: resume.skills,
                notableClaims: resume.notableClaims,
              },
              null,
              2,
            )}`,
        },
      ],
    }),
  );

  if (!response.parsed_output) {
    throw new Error("Could not build an interview plan from this resume.");
  }

  // Probes that name a competency the criteria file does not define are dropped
  // rather than kept — an off-standard probe is exactly what the file exists to
  // prevent, and a probe with no competency has nothing to score against.
  const validIds = new Set(competencies.map((c) => c.id));
  const resumeProbes = response.parsed_output.resumeProbes.filter((p) =>
    validIds.has(p.competencyId),
  );

  return {
    criteria: {
      criteriaSetId: criteria.criteriaSetId,
      roleSlug: criteria.roleSlug,
      roleTitle: criteria.roleTitle,
      sector: criteria.sector,
      version: criteria.version,
      sourcePath: criteria.sourcePath,
      sourceHash: criteria.sourceHash,
      competencies,
    },
    sector: criteria.sector,
    roleTitle: criteria.roleTitle,
    seniority,
    questionBudget,
    targets,
    resumeProbes,
    openingQuestion: response.parsed_output.openingQuestion,
    focusRationale: response.parsed_output.focusRationale,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Competencies for a plan, tolerating plans written before criteria files
 * existed. Returns an empty list for those, which every caller already handles
 * because an interview that reached no competency produces the same shape.
 */
export function planCompetencies(plan: InterviewPlan): Competency[] {
  return plan.criteria?.competencies ?? [];
}
