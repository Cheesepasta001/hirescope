"use client";

import Link from "next/link";
import { round, RADAR_MAX, type RadarPoint } from "./SkillRadar";

/**
 * The candidate card — the summary a manager scans before deciding who to talk to.
 *
 * Three things it deliberately does that a stats card usually does not:
 *
 *   - The overall score is shown with what it rests on ("6 of 8 competencies").
 *     A number without its coverage is the main way these summaries mislead.
 *   - Unreached competencies are listed as unreached rather than omitted or
 *     zeroed, so a thin interview looks thin.
 *   - The recommendation is a chip, never a decision. Nothing on this card
 *     advances, rejects, or hides a candidate; the manager does that.
 */

export type CardCandidate = {
  candidateId: string;
  name: string;
  headline: string;
  roleTitle: string;
  seniority: string;
  yearsExperience: number;
  overallScore: number;
  recommendation: string;
  competenciesCounted?: number;
  competenciesTotal?: number;
  competencies: RadarPoint[];
  contact?: { email: string; phone?: string | null; location?: string | null };
  /** Optional context line — search match reasons, assessment date, and so on. */
  footnote?: string;
};

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_yes: "Strong yes",
  yes: "Yes",
  leaning_yes: "Leaning yes",
  no: "No",
  insufficient_evidence: "Insufficient evidence",
};

const RECOMMENDATION_COLORS: Record<string, string> = {
  strong_yes: "var(--good)",
  yes: "var(--good)",
  leaning_yes: "var(--warn)",
  no: "var(--bad)",
  insufficient_evidence: "var(--ink-faint)",
};

export function recommendationLabel(value: string): string {
  return RECOMMENDATION_LABELS[value] ?? value;
}

export function recommendationColor(value: string): string {
  return RECOMMENDATION_COLORS[value] ?? "var(--ink-dim)";
}

/** Score bands for the overall number. Presentation only — nothing gates on these. */
function scoreColor(score: number): string {
  if (score >= 75) return "var(--good)";
  if (score >= 55) return "var(--warn)";
  return "var(--bad)";
}

export function CandidateCard({
  candidate,
  href,
  maxCompetencies = 6,
}: {
  candidate: CardCandidate;
  href?: string;
  /** The card shows the strongest few; the full report shows every one. */
  maxCompetencies?: number;
}) {
  const reached = candidate.competencies.filter((c) => c.reached !== false);
  const unreachedCount = candidate.competencies.length - reached.length;
  const shown = [...reached].sort((a, b) => b.score - a.score).slice(0, maxCompetencies);

  const counted = candidate.competenciesCounted ?? reached.length;
  const total = candidate.competenciesTotal ?? candidate.competencies.length;

  const body = (
    <article className="panel p-5 h-full flex flex-col gap-4 transition-colors hover:border-[var(--accent-dim)]">
      <header className="flex items-start gap-4">
        <div className="shrink-0 text-center">
          <div
            className="text-3xl font-semibold tabular-nums leading-none"
            style={{ color: scoreColor(candidate.overallScore) }}
          >
            {candidate.overallScore}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-[var(--ink-faint)]">
            overall
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{candidate.name}</div>
          <div className="text-sm text-[var(--ink-dim)] truncate">{candidate.headline}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-[var(--ink-faint)]">
            <span className="chip">{candidate.roleTitle}</span>
            <span className="chip capitalize">{candidate.seniority}</span>
            <span className="chip">{round(candidate.yearsExperience)} yrs</span>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3 text-xs">
        <span
          className="chip font-medium"
          style={{ color: recommendationColor(candidate.recommendation) }}
        >
          {recommendationLabel(candidate.recommendation)}
        </span>
        {/* The denominator travels with the number, always. */}
        <span className="text-[var(--ink-faint)]">
          {counted} of {total} competencies assessed
        </span>
      </div>

      {shown.length > 0 && (
        <ul className="space-y-1.5">
          {shown.map((c) => (
            <li key={c.competencyId} className="flex items-center gap-2 text-xs">
              <span className="w-32 shrink-0 truncate text-[var(--ink-dim)]">{c.label}</span>
              <span className="h-1.5 flex-1 rounded-full bg-[var(--panel-2)] overflow-hidden">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(Math.min(RADAR_MAX, Math.max(0, c.score)) / RADAR_MAX) * 100}%`,
                    background: c.confidence === "low" ? "var(--accent-dim)" : "var(--accent)",
                  }}
                />
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums">
                {round(c.score)}
                <span className="text-[var(--ink-faint)]">/{RADAR_MAX}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {unreachedCount > 0 && (
        <p className="text-[11px] text-[var(--warn)]">
          {unreachedCount} competenc{unreachedCount === 1 ? "y was" : "ies were"} not reached by
          the interview and {unreachedCount === 1 ? "is" : "are"} excluded from the score.
        </p>
      )}

      {candidate.contact && (
        <div className="mt-auto border-t border-[var(--border)] pt-3 text-xs text-[var(--ink-dim)] space-y-0.5">
          <div className="truncate">{candidate.contact.email}</div>
          {candidate.contact.phone && <div>{candidate.contact.phone}</div>}
          {candidate.contact.location && (
            <div className="text-[var(--ink-faint)]">{candidate.contact.location}</div>
          )}
        </div>
      )}

      {candidate.footnote && (
        <p className="text-[11px] text-[var(--ink-faint)]">{candidate.footnote}</p>
      )}
    </article>
  );

  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}
