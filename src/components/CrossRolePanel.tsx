"use client";

import { SkillRadar, round, RADAR_MAX, type RadarPoint } from "./SkillRadar";

/**
 * A cross-role read, rendered as visibly secondary evidence.
 *
 * Everything here is styled a step down from the primary assessment on purpose.
 * The interview was designed for a different role; the reader should be able to
 * tell that at a glance rather than by reading a caveat, because the risk with
 * this feature is a manager treating a cross-role number as equivalent to a
 * real one.
 */

export type CrossRoleRead = {
  id: string;
  targetRoleSlug: string;
  targetRoleTitle: string;
  overallScore: number | null;
  belowFloor: boolean;
  floorReason: string | null;
  evidencedWeight: number;
  targetTotalWeight: number;
  evidencedCount: number;
  targetCompetencyCount: number;
  roleSpecificEvidenced: number;
  summary: string;
  createdAt: string;
  competencies: {
    competencyKey: string;
    label: string;
    priority: string;
    origin: "transferred" | "rescored" | "not_evidenced";
    score: number | null;
    confidence: "low" | "medium" | "high";
    evidenceQuote: string | null;
    note: string | null;
  }[];
};

const ORIGIN_LABEL: Record<CrossRoleRead["competencies"][number]["origin"], string> = {
  transferred: "carried across",
  rescored: "read from transcript",
  not_evidenced: "no evidence",
};

const ORIGIN_COLOR: Record<CrossRoleRead["competencies"][number]["origin"], string> = {
  transferred: "var(--good)",
  rescored: "var(--accent)",
  not_evidenced: "var(--ink-faint)",
};

export function CrossRolePanel({
  read,
  interviewedForTitle,
}: {
  read: CrossRoleRead;
  interviewedForTitle: string;
}) {
  const points: RadarPoint[] = read.competencies.map((c) => ({
    competencyId: c.competencyKey,
    label: c.label,
    score: c.score ?? 0,
    confidence: c.confidence,
    origin: c.origin,
    priority: c.priority,
    evidence: c.evidenceQuote ?? undefined,
    note: c.note ?? undefined,
  }));

  return (
    <section className="panel border-dashed p-5 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
            Secondary evidence
          </div>
          <h3 className="mt-1 font-medium">Read against {read.targetRoleTitle}</h3>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            {new Date(read.createdAt).toLocaleDateString()} · from the {interviewedForTitle}{" "}
            interview
          </p>
        </div>

        <div className="text-right">
          {read.overallScore === null ? (
            <div className="text-sm font-medium text-[var(--warn)]">
              Insufficient overlap to score
            </div>
          ) : (
            <>
              <div className="text-3xl font-semibold tabular-nums text-[var(--ink-dim)]">
                {read.overallScore}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                indicative only
              </div>
            </>
          )}
        </div>
      </header>

      {/* The standing label. Present whether or not there is a number, because
          the limitation does not go away when the coverage is good. */}
      <p className="text-xs text-[var(--ink-dim)] leading-relaxed border-l-2 border-[var(--warn)] pl-3">
        This candidate was interviewed for <strong>{interviewedForTitle}</strong>, not for{" "}
        {read.targetRoleTitle}. The questions for this role were never asked, so this is weaker
        evidence than a first-hand assessment and should not be compared directly against the
        scores of candidates who interviewed for it.
      </p>

      {read.floorReason && (
        <p className="text-xs text-[var(--warn)] leading-relaxed">{read.floorReason}</p>
      )}

      <p className="text-sm text-[var(--ink-dim)] leading-relaxed">{read.summary}</p>

      <div className="text-xs text-[var(--ink-faint)]">
        Rests on {read.evidencedCount} of {read.targetCompetencyCount} competencies,{" "}
        {read.evidencedWeight} of {read.targetTotalWeight} weight
        {" · "}
        {read.roleSpecificEvidenced} specific to this role
      </div>

      <div className="grid gap-5 lg:grid-cols-[auto_1fr] items-start">
        <div>
          <SkillRadar points={points} size={320} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--ink-faint)] max-w-[320px]">
            <span>● carried across</span>
            <span>◆ read from transcript</span>
            <span>dashed · no evidence</span>
          </div>
        </div>

        <ul className="space-y-2.5">
          {read.competencies.map((c) => (
            <li
              key={c.competencyKey}
              className="border-t border-[var(--border)] pt-2.5 first:border-0 first:pt-0"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm">
                  {c.label}
                  <span
                    className="ml-2 text-[10px] uppercase tracking-wider"
                    style={{ color: ORIGIN_COLOR[c.origin] }}
                  >
                    {ORIGIN_LABEL[c.origin]}
                  </span>
                </span>
                <span className="text-sm tabular-nums shrink-0">
                  {c.score === null ? (
                    <span className="text-xs text-[var(--ink-faint)]">—</span>
                  ) : (
                    <>
                      {round(c.score)}
                      <span className="text-[var(--ink-faint)]">/{RADAR_MAX}</span>
                    </>
                  )}
                </span>
              </div>
              {c.note && <p className="mt-0.5 text-xs text-[var(--ink-faint)]">{c.note}</p>}
              {c.evidenceQuote && (
                <p className="mt-1 text-xs text-[var(--ink-faint)] border-l-2 border-[var(--border)] pl-3 italic">
                  {c.evidenceQuote}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
