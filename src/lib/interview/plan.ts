import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { claude, MODEL, EFFORT } from "@/lib/claude";
import type { ExtractedResume } from "@/lib/resume/schema";
import { competenciesFor, SECTORS, type SectorId } from "./sectors";

/**
 * The plan is fixed at the start of the interview and never regenerated. That
 * matters for two reasons: the candidate gets a consistent experience, and the
 * plan is the audit record of what the interview intended to assess, which is
 * what a bias audit under NYC Local Law 144 actually needs to inspect.
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

export type InterviewPlan = {
  sector: SectorId;
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

export async function buildPlan(
  resume: ExtractedResume,
  sector: SectorId,
  roleTitle: string,
  seniority: string,
): Promise<InterviewPlan> {
  const competencies = competenciesFor(sector);
  const questionBudget = BUDGET[seniority] ?? 12;

  // Sector competencies get the larger share; universal ones still get real
  // coverage because they are what cross-candidate comparison relies on.
  const sectorCount = SECTORS[sector]?.competencies.length ?? 2;
  const targets = competencies.map((c, i) => ({
    competencyId: c.id,
    label: c.label,
    targetQuestions: i < sectorCount ? 2 : 1,
  }));

  const response = await claude.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system:
      `You are designing an interview plan for a ${seniority} ${roleTitle} role in `
      + `${SECTORS[sector]?.label ?? sector}.\n\n`
      + `Available competency ids: ${competencies.map((c) => c.id).join(", ")}.\n\n`
      + `Design probes that would separate someone who genuinely did the work from `
      + `someone who wrote a good bullet point about it. The best probes ask for a `
      + `specific decision, a specific number, or a specific failure — details that `
      + `are cheap to recall if you were there and expensive to fabricate if you were not.\n\n`
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
  });

  if (!response.parsed_output) {
    throw new Error("Could not build an interview plan from this resume.");
  }

  return {
    sector,
    roleTitle,
    seniority,
    questionBudget,
    targets,
    resumeProbes: response.parsed_output.resumeProbes,
    openingQuestion: response.parsed_output.openingQuestion,
    focusRationale: response.parsed_output.focusRationale,
    createdAt: new Date().toISOString(),
  };
}
