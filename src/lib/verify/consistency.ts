import type { ExtractedResume } from "@/lib/resume/schema";

/**
 * Resume verification that stays on the right side of the line.
 *
 * What this does: checks the resume against itself, and against what the
 * candidate says in the interview. Timeline arithmetic, overlapping employment,
 * skills claimed but never demonstrated, seniority jumps. All of it derives from
 * documents the candidate handed us for exactly this purpose.
 *
 * What this deliberately does not do: search social media, scrape LinkedIn, or
 * assemble a profile of who someone is outside their application. In the US,
 * gathering third-party information about a candidate for a hiring decision makes
 * the gatherer a consumer reporting agency under FCRA, with disclosure, written
 * consent, and dispute-resolution duties attached. Scraping LinkedIn breaches
 * their terms regardless of the hiQ line of cases. And pulling someone's social
 * presence surfaces protected characteristics — race, religion, disability,
 * pregnancy, age — which is direct EEOC disparate-impact exposure the moment it
 * touches a decision.
 *
 * Candidate-supplied professional links are handled in ./links.ts, under explicit
 * per-link consent, and every finding is candidate-visible and rebuttable.
 */

export type Finding = {
  kind:
    | "timeline_gap"
    | "overlap"
    | "title_inflation"
    | "unverified_claim"
    | "skill_unsupported"
    | "arithmetic_mismatch";
  severity: "info" | "low" | "medium" | "high";
  field?: string;
  detail: string;
  evidence?: unknown;
};

/** Parse "2021-03", "2021", "present" into a comparable month index. */
function toMonths(value: string): number | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (v === "present" || v === "current" || v === "now") {
    const now = new Date();
    return now.getFullYear() * 12 + now.getMonth();
  }
  const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(v);
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) - 1 : 0;
  if (year < 1950 || year > 2100) return null;
  return year * 12 + month;
}

const monthsToLabel = (m: number) => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;

export function checkConsistency(resume: ExtractedResume): Finding[] {
  const findings: Finding[] = [];

  const spans = resume.employment
    .map((e, i) => ({
      i,
      company: e.company,
      title: e.title,
      start: toMonths(e.dates.start),
      end: toMonths(e.dates.end),
      raw: e.dates.raw,
    }))
    .filter((s): s is typeof s & { start: number } => s.start !== null)
    .sort((a, b) => a.start - b.start);

  // Gaps between consecutive roles. Reported as a neutral fact with no inferred
  // cause — caregiving, illness, and study are all protected or none of our
  // business, so the finding says only that the gap exists.
  for (let i = 1; i < spans.length; i++) {
    const prevEnd = spans[i - 1].end;
    if (prevEnd === null) continue;
    const gap = spans[i].start - prevEnd;
    if (gap >= 6) {
      findings.push({
        kind: "timeline_gap",
        severity: gap >= 18 ? "medium" : "low",
        field: "employment",
        detail:
          `${gap} months between leaving ${spans[i - 1].company} (${monthsToLabel(prevEnd)}) and `
          + `starting at ${spans[i].company} (${monthsToLabel(spans[i].start)}). Worth asking about `
          + `in a neutral way; there is no adverse inference to draw from a gap by itself.`,
        evidence: { from: monthsToLabel(prevEnd), to: monthsToLabel(spans[i].start), months: gap },
      });
    }
  }

  // Overlapping full-time roles. Often legitimate (consulting, a handover month),
  // occasionally a sign of padding. Either way it is a question, not a verdict.
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const a = spans[i];
      const b = spans[j];
      if (a.end === null) continue;
      const overlap = Math.min(a.end, b.end ?? Infinity) - Math.max(a.start, b.start);
      if (overlap >= 3) {
        findings.push({
          kind: "overlap",
          severity: overlap >= 12 ? "medium" : "low",
          field: "employment",
          detail:
            `${a.company} (${a.raw}) and ${b.company} (${b.raw}) overlap by about ${overlap} months. `
            + `Consulting, contract work, and handover periods explain most overlaps.`,
          evidence: { a: a.company, b: b.company, months: overlap },
        });
      }
    }
  }

  // Stated years of experience versus what the dates actually sum to.
  const totalMonths = spans.reduce((acc, s) => acc + ((s.end ?? s.start) - s.start), 0);
  const impliedYears = totalMonths / 12;
  if (resume.totalYearsExperience > 0 && impliedYears > 0) {
    const delta = resume.totalYearsExperience - impliedYears;
    if (delta > 2) {
      findings.push({
        kind: "arithmetic_mismatch",
        severity: delta > 4 ? "medium" : "low",
        field: "totalYearsExperience",
        detail:
          `The resume implies about ${impliedYears.toFixed(1)} years of dated employment, but `
          + `${resume.totalYearsExperience} years are claimed. Undated or early-career work may `
          + `account for the difference.`,
        evidence: { claimed: resume.totalYearsExperience, dated: Number(impliedYears.toFixed(1)) },
      });
    }
  }

  // Skills that appear only in a list and are never described in any role. This
  // is the single most useful pre-interview finding: it tells the engine exactly
  // which claims are worth probing.
  const listOnly = resume.skills.filter((s) => s.assertedIn === "skills_list_only");
  if (listOnly.length > 0) {
    findings.push({
      kind: "skill_unsupported",
      severity: listOnly.length > 8 ? "medium" : "info",
      field: "skills",
      detail:
        `${listOnly.length} skill(s) are listed but never described in any role: `
        + `${listOnly.slice(0, 12).map((s) => s.label).join(", ")}`
        + `${listOnly.length > 12 ? ", and others" : ""}. Listing is not evidence; the interview `
        + `will test the ones that matter for this role.`,
      evidence: { skills: listOnly.map((s) => s.label) },
    });
  }

  // Seniority jumps. Titles are not standardised across companies, so this is
  // low-severity by construction.
  const RANK = ["intern", "junior", "associate", "", "senior", "staff", "principal", "lead", "head", "director", "vp", "chief"];
  const rankOf = (title: string) => {
    const t = title.toLowerCase();
    for (let r = RANK.length - 1; r >= 0; r--) {
      if (RANK[r] && t.includes(RANK[r])) return r;
    }
    return 3;
  };
  for (let i = 1; i < spans.length; i++) {
    const jump = rankOf(spans[i].title) - rankOf(spans[i - 1].title);
    const monthsBetween = spans[i].start - spans[i - 1].start;
    if (jump >= 3 && monthsBetween < 24) {
      findings.push({
        kind: "title_inflation",
        severity: "low",
        field: "employment",
        detail:
          `Title moved from "${spans[i - 1].title}" to "${spans[i].title}" in about `
          + `${monthsBetween} months. Titles vary a lot between companies, so this is worth a `
          + `question about scope rather than a concern in itself.`,
        evidence: { from: spans[i - 1].title, to: spans[i].title, months: monthsBetween },
      });
    }
  }

  return findings;
}

/**
 * After the interview: which resume claims did the conversation fail to support?
 * This is where verification gets its teeth — not from the internet, but from
 * whether the person could talk about their own stated work.
 */
export function reconcileWithInterview(
  resume: ExtractedResume,
  demonstratedSkills: { label: string; confidence: number }[],
  probedClaims: { claim: string; supported: boolean; note: string }[],
): Finding[] {
  const findings: Finding[] = [];
  const demonstrated = new Map(demonstratedSkills.map((s) => [s.label.toLowerCase(), s.confidence]));

  for (const claim of probedClaims) {
    if (!claim.supported) {
      findings.push({
        kind: "unverified_claim",
        severity: "medium",
        field: "notableClaims",
        detail: `Asked about "${claim.claim}" and the answer did not support it. ${claim.note}`,
        evidence: claim,
      });
    }
  }

  // A headline skill the interview probed and the candidate could not stand up.
  for (const skill of resume.skills) {
    if (skill.assertedIn === "skills_list_only") continue;
    const conf = demonstrated.get(skill.label.toLowerCase());
    if (conf !== undefined && conf < 0.3) {
      findings.push({
        kind: "unverified_claim",
        severity: "medium",
        field: "skills",
        detail:
          `"${skill.label}" is described as part of their work on the resume, but the `
          + `interview answers evidenced it only weakly.`,
        evidence: { skill: skill.label, confidence: conf },
      });
    }
  }

  return findings;
}
