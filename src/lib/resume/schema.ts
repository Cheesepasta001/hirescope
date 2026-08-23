import { z } from "zod";

// Kept deliberately flat and permissive. Resumes are messy, and a schema that
// demands clean data just pushes the model into inventing it.

export const DateRangeSchema = z.object({
  start: z.string().describe("ISO month if known, e.g. 2021-03. Empty string if absent."),
  end: z.string().describe("ISO month, or 'present', or empty string if absent."),
  raw: z.string().describe("The date text exactly as printed on the resume."),
});

export const EmploymentSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string(),
  dates: DateRangeSchema,
  summary: z.string().describe("What they say they did, condensed to 1-2 sentences."),
  achievements: z.array(z.string()).describe("Quantified claims, verbatim where possible."),
  technologies: z.array(z.string()).describe("Tools, languages, systems named for this role."),
});

export const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  dates: DateRangeSchema,
  detail: z.string().describe("Honours, GPA, thesis — empty string if absent."),
});

export const SkillClaimSchema = z.object({
  label: z.string().describe("Canonical name, e.g. 'PyTorch' not 'pytorch experience'."),
  kind: z.enum(["skill", "tool", "domain", "soft", "credential"]),
  // The whole point: distinguish a skill backed by described work from one that
  // only appears in a comma-separated list at the bottom of the page.
  assertedIn: z.enum(["skills_list_only", "described_in_role", "quantified_result"]),
  yearsClaimed: z.number().describe("0 if not stated or not inferable."),
});

export const ExtractedResumeSchema = z.object({
  name: z.string(),
  email: z.string().describe("Empty string if not present."),
  phone: z.string().describe("Empty string if not present."),
  location: z.string().describe("Empty string if not present."),
  links: z.array(
    z.object({
      url: z.string(),
      kind: z.enum(["github", "linkedin", "portfolio", "scholar", "orcid", "other"]),
    }),
  ).describe("Only URLs actually printed on the resume."),
  headline: z.string().describe("One line: seniority + discipline, e.g. 'Senior backend engineer, payments'."),
  summary: z.string().describe("Two or three sentences, neutral tone, no salesmanship."),
  totalYearsExperience: z.number(),
  sector: z.enum([
    "engineering", "finance", "hr", "sales", "product",
    "healthcare", "legal", "operations", "marketing", "other",
  ]),
  seniority: z.enum(["junior", "mid", "senior", "lead"]),
  employment: z.array(EmploymentSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillClaimSchema),
  // These drive the interview plan directly — each becomes something to probe.
  notableClaims: z.array(
    z.object({
      claim: z.string().describe("A specific, checkable assertion from the resume."),
      whereFrom: z.string().describe("Which role or section it came from."),
      checkable: z.boolean().describe("True if a good follow-up question could test it."),
    }),
  ),
  gapsOrOddities: z.array(z.string()).describe(
    "Purely factual observations a careful reader would notice: unexplained gaps, "
    + "overlapping roles, titles that jump several levels. Not judgements.",
  ),
});

export type ExtractedResume = z.infer<typeof ExtractedResumeSchema>;
export type Employment = z.infer<typeof EmploymentSchema>;
export type SkillClaim = z.infer<typeof SkillClaimSchema>;
