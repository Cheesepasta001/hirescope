"use client";

export type RadarPoint = {
  competencyId: string;
  label: string;
  /** 0-10, matching the criteria scale. */
  score: number;
  confidence: "low" | "medium" | "high";
  /** False when the interview never tested this competency. */
  reached?: boolean;
  priority?: string;
  /** Which stage produced the score. Homework scores are labelled in the detail view. */
  source?: "interview" | "homework";
  evidence?: string;
  note?: string;
};

export const RADAR_MAX = 10;

/**
 * The skill diagram.
 *
 * Axes come from the role's criteria file, so their number and their labels vary
 * by role — anywhere from two to a dozen. Nothing here assumes a fixed set.
 *
 * Two things are drawn rather than merely labelled, because a diagram that
 * renders them identically to real scores is actively misleading:
 *
 *   - **Unreached competencies** get a dashed spoke and no marker, and the
 *     shape does not pass through them. An interview that covered five of eight
 *     competencies should look like it covered five, not like a candidate who
 *     scored zero on three.
 *   - **Low-confidence scores** get a hollow marker, so a thinly-evidenced 8
 *     does not read the same as a well-evidenced 8.
 */
export function SkillRadar({ points, size = 380 }: { points: RadarPoint[]; size?: number }) {
  const n = points.length;

  if (n < 3) {
    return (
      <p className="text-sm text-[var(--ink-faint)]">
        {n === 0
          ? "No competencies were scored."
          : "A diagram needs at least three competencies. This role's criteria file defines "
            + `${n}, so the scores are listed instead.`}
      </p>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  // Long labels on many axes need more margin than a four-axis chart does.
  const r = size / 2 - (n > 8 ? 74 : 62);

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const at = (i: number, radius: number) => ({
    x: cx + Math.cos(angle(i)) * radius,
    y: cy + Math.sin(angle(i)) * radius,
  });
  const radiusFor = (score: number) =>
    (Math.max(0, Math.min(RADAR_MAX, score)) / RADAR_MAX) * r;

  const isReached = (p: RadarPoint) => p.reached !== false;
  const reached = points.map(isReached);
  const reachedCount = reached.filter(Boolean).length;

  const rings = [0.25, 0.5, 0.75, 1];

  // The filled shape spans only the competencies that were actually assessed.
  const shape = points
    .map((p, i) => (isReached(p) ? at(i, radiusFor(p.score)) : null))
    .filter((pt): pt is { x: number; y: number } => pt !== null)
    .map((pt) => `${pt.x},${pt.y}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img"
      aria-label={`Competency scores across ${n} axes, ${reachedCount} of them assessed`}
    >
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={points.map((_, i) => { const p = at(i, r * ring); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke="var(--border)" strokeWidth="1"
        />
      ))}

      {points.map((p, i) => {
        const end = at(i, r);
        return (
          <line
            key={p.competencyId} x1={cx} y1={cy} x2={end.x} y2={end.y}
            stroke="var(--border)" strokeWidth="1"
            strokeDasharray={!isReached(p) || p.confidence === "low" ? "3 4" : undefined}
          />
        );
      })}

      {reachedCount >= 3 && (
        <polygon
          points={shape} fill="var(--accent)" fillOpacity="0.16"
          stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round"
        />
      )}

      {points.map((p, i) => {
        if (!isReached(p)) return null;
        const pt = at(i, radiusFor(p.score));
        const low = p.confidence === "low";
        return (
          <circle
            key={p.competencyId} cx={pt.x} cy={pt.y} r="4"
            fill={low ? "var(--bg)" : "var(--accent)"}
            stroke="var(--accent)" strokeWidth="2"
          >
            <title>{`${p.label}: ${round(p.score)}/${RADAR_MAX} (${p.confidence} confidence)`}</title>
          </circle>
        );
      })}

      {points.map((p, i) => {
        const pt = at(i, r + 26);
        const a = angle(i);
        const anchor = Math.abs(Math.cos(a)) < 0.25 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        const reachedHere = isReached(p);
        return (
          <g key={p.competencyId}>
            <text
              x={pt.x} y={pt.y} textAnchor={anchor} dominantBaseline="middle"
              fontSize="10.5" fill={reachedHere ? "var(--ink-dim)" : "var(--ink-faint)"}
            >
              {truncate(p.label, n > 8 ? 26 : 22)}
            </text>
            <text
              x={pt.x} y={pt.y + 12} textAnchor={anchor} dominantBaseline="middle"
              fontSize="10" fontWeight="600"
              fill={reachedHere ? (p.confidence === "low" ? "var(--ink-faint)" : "var(--ink)") : "var(--ink-faint)"}
            >
              {reachedHere ? (
                <>
                  {round(p.score)}
                  <tspan fill="var(--ink-faint)">/{RADAR_MAX}</tspan>
                  {p.confidence === "low" && <tspan fill="var(--warn)"> ·low conf</tspan>}
                </>
              ) : (
                <tspan fill="var(--warn)">not assessed</tspan>
              )}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** One decimal, but only when it says something — 7 rather than 7.0. */
export function round(score: number): string {
  const r = Math.round(score * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
