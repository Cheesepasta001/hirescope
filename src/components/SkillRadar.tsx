"use client";

export type RadarPoint = {
  competencyId: string;
  label: string;
  score: number; // 0-100
  confidence: "low" | "medium" | "high";
  evidence?: string;
  note?: string;
};

/**
 * The skill diagram.
 *
 * Confidence is drawn, not just labelled: low-confidence axes get a hollow
 * marker and a dashed spoke, so a manager can see at a glance which parts of the
 * shape are supported by the interview and which are guesses from thin evidence.
 * A radar chart that renders a 20-confidence score identically to a 90-confidence
 * one is actively misleading, which is the usual failing of these diagrams.
 */
export function SkillRadar({ points, size = 380 }: { points: RadarPoint[]; size?: number }) {
  if (points.length < 3) {
    return (
      <p className="text-sm text-[var(--ink-faint)]">
        Not enough scored competencies to draw a diagram.
      </p>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 62;
  const n = points.length;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const at = (i: number, radius: number) => ({
    x: cx + Math.cos(angle(i)) * radius,
    y: cy + Math.sin(angle(i)) * radius,
  });

  const rings = [0.25, 0.5, 0.75, 1];
  const polygon = points
    .map((p, i) => {
      const pt = at(i, (Math.max(0, Math.min(100, p.score)) / 100) * r);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img"
      aria-label="Competency scores by axis">
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
            strokeDasharray={p.confidence === "low" ? "3 4" : undefined}
          />
        );
      })}

      <polygon points={polygon} fill="var(--accent)" fillOpacity="0.16"
        stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />

      {points.map((p, i) => {
        const pt = at(i, (Math.max(0, Math.min(100, p.score)) / 100) * r);
        const low = p.confidence === "low";
        return (
          <circle
            key={p.competencyId} cx={pt.x} cy={pt.y} r="4"
            fill={low ? "var(--bg)" : "var(--accent)"}
            stroke="var(--accent)" strokeWidth="2"
          >
            <title>{`${p.label}: ${p.score}/100 (${p.confidence} confidence)`}</title>
          </circle>
        );
      })}

      {points.map((p, i) => {
        const pt = at(i, r + 26);
        const a = angle(i);
        const anchor = Math.abs(Math.cos(a)) < 0.25 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        return (
          <g key={p.competencyId}>
            <text
              x={pt.x} y={pt.y} textAnchor={anchor} dominantBaseline="middle"
              fontSize="10.5" fill="var(--ink-dim)"
            >
              {p.label.length > 22 ? `${p.label.slice(0, 21)}…` : p.label}
            </text>
            <text
              x={pt.x} y={pt.y + 12} textAnchor={anchor} dominantBaseline="middle"
              fontSize="10" fontWeight="600"
              fill={p.confidence === "low" ? "var(--ink-faint)" : "var(--ink)"}
            >
              {p.score}
              {p.confidence === "low" && <tspan fill="var(--warn)"> ·low conf</tspan>}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
