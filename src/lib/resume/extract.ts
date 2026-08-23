import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { claude, MODEL, EFFORT } from "@/lib/claude";
import { ExtractedResumeSchema, type ExtractedResume } from "./schema";

const SYSTEM = `You extract structured data from resumes.

Rules that matter more than completeness:
- Never invent. If a field is not on the page, use an empty string or an empty array.
- Preserve the candidate's own wording for achievements and claims. Do not upgrade
  "helped migrate" into "led migration".
- totalYearsExperience: count professional full-time work only. Internships count
  at half. Education does not count.
- For each skill, assertedIn is the important field. "skills_list_only" means the
  term appears in a skills section but no role describes using it. "described_in_role"
  means a role narrative mentions actually doing it. "quantified_result" means it is
  tied to a specific measured outcome.
- gapsOrOddities is for neutral factual observations only. Note an unexplained
  14-month gap; do not speculate about why it exists. Never note anything about
  age, gender, nationality, ethnicity, religion, health, or family status, and never
  infer those from names, dates, or institutions.`;

export async function extractResume(rawText: string): Promise<ExtractedResume> {
  const response = await claude.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: "adaptive" },
    output_config: {
      effort: EFFORT.extraction,
      format: zodOutputFormat(ExtractedResumeSchema),
    },
    messages: [
      {
        role: "user",
        content: `Extract this resume.\n\n<resume>\n${rawText}\n</resume>`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Could not parse that resume into structured data. The file may be malformed.");
  }
  return response.parsed_output;
}
