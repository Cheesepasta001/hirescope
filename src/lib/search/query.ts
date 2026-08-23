import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { claude, MODEL, EFFORT } from "@/lib/claude";
import { db, readJson } from "@/lib/db";
import { embed, cosine } from "@/lib/embeddings";
import type { CompetencyScore } from "@/lib/assess/score";

/**
 * Manager search: "Software engineer with PyTorch experience" -> ranked people.
 *
 * Three stages. Parse the query into structured constraints, filter the corpus
 * on those constraints, then rank what survives by a blend of semantic
 * similarity, tag-match strength, and interview score.
 *
 * The tag filter carries most of the weight, which is deliberate: a manager who
 * types "PyTorch" wants people who demonstrated PyTorch, not people who are
 * semantically adjacent to machine learning.
 */

const ParsedQuerySchema = z.object({
  roleKeywords: z.array(z.string()).describe("Role or title terms, e.g. ['software engineer', 'backend']."),
  requiredTags: z.array(z.string()).describe(
    "Hard requirements the manager named explicitly. Canonical form: 'PyTorch', not 'pytorch experience'.",
  ),
  niceToHaveTags: z.array(z.string()).describe("Implied or secondary skills worth boosting but not filtering on."),
  sector: z.string().describe(
    "One of: engineering, finance, hr, sales, product, healthcare, legal, operations, "
    + "marketing, other. Empty string if the query does not imply one.",
  ),
  seniority: z.array(z.string()).describe("Any of junior, mid, senior, lead. Empty array if unspecified."),
  minYearsExperience: z.number().describe("0 if unspecified."),
  minScore: z.number().describe("0 if unspecified. Only set when the manager asks for quality explicitly."),
  semanticQuery: z.string().describe("A clean restatement of the intent, used for the embedding lookup."),
  interpretation: z.string().describe("One sentence telling the manager how the query was read, so they can correct it."),
});

export type ParsedQuery = z.infer<typeof ParsedQuerySchema>;

export type SearchHit = {
  candidateId: string;
  name: string;
  headline: string;
  sector: string;
  seniority: string;
  yearsExperience: number;
  overallScore: number;
  recommendation: string;
  summary: string;
  matchScore: number;
  matchedTags: { label: string; confidence: number; status: string }[];
  missingRequired: string[];
  competencies: CompetencyScore[];
};

export async function parseQuery(raw: string): Promise<ParsedQuery> {
  const response = await claude.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system:
      `You turn a hiring manager's plain-English search into structured filters.\n\n`
      + `Only put something in requiredTags if the manager clearly requires it. `
      + `"Engineer who has worked with PyTorch" requires PyTorch. "Engineer, ideally `
      + `with some ML background" does not require anything — that is a nice-to-have.\n\n`
      + `Normalise tags to their canonical product or concept name: "pytorch" and `
      + `"PyTorch experience" both become "PyTorch".\n\n`
      + `Refuse to encode filters on protected characteristics. If the query asks for a `
      + `demographic — age, gender, nationality, ethnicity, religion, disability, family `
      + `status, or a proxy such as "recent graduate" or "digital native" — leave those `
      + `out of every field and say plainly in the interpretation that the filter was `
      + `dropped and why.`,
    thinking: { type: "adaptive" },
    output_config: { effort: EFFORT.search, format: zodOutputFormat(ParsedQuerySchema) },
    messages: [{ role: "user", content: raw }],
  });

  if (!response.parsed_output) {
    throw new Error("Could not interpret that search query.");
  }
  return response.parsed_output;
}

export async function search(raw: string, limit = 25): Promise<{ parsed: ParsedQuery; hits: SearchHit[] }> {
  const parsed = await parseQuery(raw);
  const queryVector = await embed(parsed.semanticQuery || raw);

  const profiles = await db.candidateProfile.findMany({
    include: {
      candidate: {
        include: { tags: { include: { tag: true } } },
      },
    },
  });

  const norm = (s: string) => s.toLowerCase().trim();
  const required = parsed.requiredTags.map(norm);
  const nice = parsed.niceToHaveTags.map(norm);

  const hits: SearchHit[] = [];

  for (const p of profiles) {
    if (parsed.sector && p.sector !== parsed.sector) continue;
    if (parsed.seniority.length && !parsed.seniority.includes(p.seniority)) continue;
    if (parsed.minYearsExperience && p.yearsExperience < parsed.minYearsExperience) continue;
    if (parsed.minScore && p.overallScore < parsed.minScore) continue;

    const candidateTags = p.candidate.tags.map((ct) => ({
      label: ct.tag.label,
      norm: norm(ct.tag.label),
      confidence: ct.confidence,
      status: ct.status,
    }));

    // Required tags are a hard gate, but matched loosely enough that "PyTorch"
    // finds "PyTorch Lightning" rather than silently returning nothing.
    const missingRequired: string[] = [];
    const matchedRequired: typeof candidateTags = [];
    for (let i = 0; i < required.length; i++) {
      const hit = candidateTags.find(
        (t) => t.norm === required[i] || t.norm.includes(required[i]) || required[i].includes(t.norm),
      );
      if (hit) matchedRequired.push(hit);
      else missingRequired.push(parsed.requiredTags[i]);
    }
    if (missingRequired.length > 0) continue;

    const matchedNice = candidateTags.filter((t) =>
      nice.some((n) => t.norm === n || t.norm.includes(n) || n.includes(t.norm)),
    );

    const roleHit = parsed.roleKeywords.some((k) => norm(p.headline).includes(norm(k)));

    const semantic = cosine(queryVector, readJson<number[]>(p.embedding, []));

    // Demonstrated beats claimed. This is the whole reason we ran an interview.
    const tagStrength =
      matchedRequired.reduce((a, t) => a + t.confidence * (t.status === "demonstrated" ? 1 : 0.55), 0)
      + matchedNice.reduce((a, t) => a + 0.4 * t.confidence * (t.status === "demonstrated" ? 1 : 0.55), 0);

    const matchScore =
      0.42 * Math.min(1, tagStrength / Math.max(1, required.length))
      + 0.24 * semantic
      + 0.24 * (p.overallScore / 100)
      + 0.10 * (roleHit ? 1 : 0);

    hits.push({
      candidateId: p.candidateId,
      name: p.candidate.name,
      headline: p.headline,
      sector: p.sector,
      seniority: p.seniority,
      yearsExperience: p.yearsExperience,
      overallScore: p.overallScore,
      recommendation: p.recommendation,
      summary: p.summary,
      matchScore: Math.round(matchScore * 100),
      matchedTags: [...matchedRequired, ...matchedNice].map((t) => ({
        label: t.label,
        confidence: t.confidence,
        status: t.status,
      })),
      missingRequired,
      competencies: readJson<CompetencyScore[]>(p.competencies, []),
    });
  }

  hits.sort((a, b) => b.matchScore - a.matchScore);
  return { parsed, hits: hits.slice(0, limit) };
}
