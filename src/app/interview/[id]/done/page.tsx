"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SkillRadar, type RadarPoint } from "@/components/SkillRadar";

type Report = {
  ready: boolean;
  name: string;
  roleTitle: string;
  overallScore: number;
  recommendation: string;
  summary: string;
  scoreExplanation: string;
  competencies: RadarPoint[];
  strengths: string[];
  concerns: string[];
  findings: { id: string; kind: string; severity: string; detail: string; response: string | null }[];
  integrity: { band: string; observations: string[]; caveat: string } | null;
  homework: {
    generated: boolean;
    estimatedMinutes: number | null;
    competencyCount: number;
    submitted: boolean;
  } | null;
};

export default function DonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/interview/${id}/report`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load your report.");
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load your report.");
      }
    })();
  }, [id]);

  async function submitResponse(findingId: string) {
    const response = drafts[findingId]?.trim();
    if (!response) return;
    await fetch(`/api/interview/${id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findingId, response }),
    });
    setSaved((s) => ({ ...s, [findingId]: true }));
  }

  if (error) return <div className="panel border-[var(--bad)] p-5 text-sm text-[var(--bad)]">{error}</div>;
  if (!report) return <p className="text-sm text-[var(--ink-dim)]">Loading your report…</p>;
  if (!report.ready) {
    return (
      <div className="panel p-6">
        <h1 className="text-lg font-medium">Interview recorded</h1>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Your assessment has not been generated yet. Check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Thanks, {report.name.split(" ")[0]}.</h1>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          This is your copy of the assessment, the same one a hiring manager sees. You have the
          right to contest anything in it.
        </p>
      </header>

      <section className="panel p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">{report.roleTitle}</h2>
          <span className="text-3xl font-semibold tabular-nums">
            {report.overallScore}
            <span className="text-base text-[var(--ink-faint)]">/100</span>
          </span>
        </div>
        <p className="mt-3 leading-relaxed text-[var(--ink-dim)]">{report.summary}</p>
        {report.scoreExplanation && (
          <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--ink-faint)] leading-relaxed">
            {report.scoreExplanation} A person makes the decision; this score does not.
          </p>
        )}
      </section>

      {/* Offered rather than demanded. The task exists to give the candidate a
          chance to show competencies the conversation missed, so pressuring
          them into it would defeat the point. */}
      {report.homework && (
        <section className="panel border-[var(--accent-dim)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-medium">
                {report.homework.submitted ? "Your practical task" : "One more thing, if you want it"}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--ink-dim)] max-w-xl leading-relaxed">
                {report.homework.submitted
                  ? "You completed the practical task. Its results are included in the scores above."
                  : `A short practical task — `
                    + (report.homework.estimatedMinutes
                      ? `about ${report.homework.estimatedMinutes} minutes — `
                      : "under an hour — ")
                    + `covering ${report.homework.competencyCount} `
                    + `${report.homework.competencyCount === 1 ? "competency" : "competencies"} `
                    + `the interview did not get far into. It can only add to the evidence behind `
                    + `your assessment.`}
              </p>
            </div>
            {!report.homework.submitted && (
              <Link href={`/interview/${id}/homework`} className="btn shrink-0">
                Open the task
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="panel p-5">
        <h2 className="text-sm font-medium mb-2">Your skill diagram</h2>
        <SkillRadar points={report.competencies} />
        <p className="mt-2 text-xs text-[var(--ink-faint)]">
          Dashed spokes are competencies the interview did not test much. Those scores are
          provisional, not conclusions about you.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-sm font-medium">What came across well</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--ink-dim)]">
            {report.strengths.map((s, i) => <li key={i}>▸ {s}</li>)}
          </ul>
        </section>
        <section className="panel p-5">
          <h2 className="text-sm font-medium">What was less clear</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--ink-dim)]">
            {report.concerns.map((s, i) => <li key={i}>▸ {s}</li>)}
          </ul>
        </section>
      </div>

      {report.findings.length > 0 && (
        <section className="panel p-5">
          <h2 className="text-sm font-medium">Notes on your resume</h2>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            These come from reading your resume against itself. If any is wrong or has an
            explanation, add it — your response is attached to the finding.
          </p>
          <div className="mt-4 space-y-4">
            {report.findings.map((f) => (
              <div key={f.id} className="border-t border-[var(--border)] pt-4 first:border-0 first:pt-0">
                <div className="text-sm text-[var(--ink-dim)]">{f.detail}</div>
                {f.response || saved[f.id] ? (
                  <p className="mt-2 text-xs text-[var(--good)]">
                    Your response has been recorded and will be shown alongside this note.
                  </p>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <input
                      className="field text-sm" placeholder="Add context (optional)"
                      value={drafts[f.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                    />
                    <button className="btn-ghost text-sm" onClick={() => void submitResponse(f.id)}>
                      Save
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {report.integrity && report.integrity.band !== "nothing_notable" && (
        <section className="panel p-5">
          <h2 className="text-sm font-medium">Session notes</h2>
          <ul className="mt-2 space-y-1 text-sm text-[var(--ink-dim)]">
            {report.integrity.observations.map((o, i) => <li key={i}>▸ {o}</li>)}
          </ul>
          <p className="mt-3 text-xs text-[var(--ink-faint)] leading-relaxed">{report.integrity.caveat}</p>
        </section>
      )}
    </div>
  );
}
