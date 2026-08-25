/**
 * Competencies, as the planner, the engine, and the scorer see them.
 *
 * This module used to hold ten hard-coded sector frameworks. It no longer holds
 * any: competencies now come from the markdown files in `criteria/`, which the
 * company's HR owns and edits. See criteria/README.md for the format and
 * src/lib/criteria/ for the parser.
 *
 * What is left here is the shape those three consumers agreed on — `id`,
 * `label`, `probes`, `weakSignals` — and the adapter that produces it from a
 * resolved criteria set. Keeping the shape means plan.ts, engine.ts, and
 * score.ts did not have to change how they read a competency, only where the
 * list comes from.
 *
 * The four general competencies (reasoning, communication, ownership,
 * collaboration) used to be appended here to every interview. They are now
 * written out explicitly in each shipped criteria file instead. That is a
 * deliberate loss of convenience: a file that says what will be assessed, with
 * nothing added by code behind the editor's back, is the only version of "HR
 * controls the criteria" that is actually true.
 */

import type { CriteriaCompetency, ResolvedCriteria } from "@/lib/criteria/load";
import type { Priority } from "@/lib/criteria/parse";

export type Competency = {
  /** The criteria file's stable key. Scores are recorded against this. */
  id: string;
  label: string;
  /** What the competency covers, in the file's own words. */
  description: string;
  /** What a strong answer demonstrates. Fed to both the question generator and the scorer. */
  probes: string;
  /** Concrete markers of a weak answer, so scoring is not purely vibes. */
  weakSignals: string;
  priority: Priority;
};

/** Sector ids remain, because Interview.sector and the search filters use them. */
export type SectorId =
  | "engineering" | "finance" | "hr" | "sales" | "product"
  | "healthcare" | "legal" | "operations" | "marketing" | "other";

export const SECTOR_LABELS: Record<SectorId, string> = {
  engineering: "Engineering",
  finance: "Banking and finance",
  hr: "HR and people",
  sales: "Sales",
  product: "Product",
  healthcare: "Healthcare",
  legal: "Legal",
  operations: "Operations",
  marketing: "Marketing",
  other: "General",
};

export function sectorLabel(sector: string): string {
  return SECTOR_LABELS[sector as SectorId] ?? sector;
}

export function toCompetency(c: CriteriaCompetency): Competency {
  return {
    id: c.key,
    label: c.label,
    description: c.description,
    probes: c.strongAnswer,
    weakSignals: c.weakAnswer,
    priority: c.priority,
  };
}

/** The competencies a criteria set defines, in the order the file lists them. */
export function competenciesFor(criteria: ResolvedCriteria): Competency[] {
  return criteria.competencies.map(toCompetency);
}

export function competencyById(competencies: Competency[], id: string): Competency | undefined {
  return competencies.find((c) => c.id === id);
}

/**
 * Rendered into the system prompt of both the interview engine and the scorer.
 * One place, so the two never describe the same standard differently.
 */
export function renderCompetencyDefinitions(competencies: Competency[]): string {
  return competencies
    .map(
      (c) =>
        `### ${c.id} — ${c.label} (priority: ${c.priority})\n`
        + `${c.description}\n`
        + `Strong: ${c.probes}\n`
        + `Weak: ${c.weakSignals}`,
    )
    .join("\n\n");
}
