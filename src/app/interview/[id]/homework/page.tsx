"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * The candidate's homework screen.
 *
 * Written to lower the stakes rather than raise them: the time estimate is
 * prominent, the rationale says plainly why they are being asked, and nothing
 * counts down. A task presented as a trial produces performances; a task
 * presented as a chance to show something produces work.
 */

type Homework = {
  id: string;
  title: string;
  brief: string;
  rationale: string;
  estimatedMinutes: number;
  competencyCount: number;
  submitted: boolean;
  submittedAt: string | null;
  graded: boolean;
};

type GradeResult = {
  overallScore: number | null;
  competenciesCounted: number | null;
  competenciesTotal: number | null;
  note: string;
  scores: { competencyKey: string; label: string; score: number; reached: boolean; note: string }[];
};

export default function HomeworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [homework, setHomework] = useState<Homework | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const pasteCount = useRef(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/${id}/homework`);
      const data = await res.json();
      if (!res.ok) {
        setRetryable(Boolean(data.retryable));
        throw new Error(data.error ?? "Could not load the task.");
      }
      setHomework(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the task.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submit() {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/${id}/homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, pasteCount: pasteCount.current }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRetryable(Boolean(data.retryable));
        throw new Error(data.error ?? "Could not submit.");
      }
      setResult(data);
      setHomework((h) => (h ? { ...h, submitted: true, graded: true } : h));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-[var(--ink-dim)]">
        Preparing your task — this takes a few seconds.
      </p>
    );
  }

  if (error && !homework) {
    return (
      <div className="panel border-[var(--bad)] p-5 max-w-xl">
        <p className="text-sm text-[var(--bad)]">{error}</p>
        {retryable && (
          <button className="btn mt-4" onClick={() => void load()}>Try again</button>
        )}
        <Link href={`/interview/${id}/done`} className="mt-3 ml-3 inline-block text-sm text-[var(--accent)]">
          Back to your assessment
        </Link>
      </div>
    );
  }

  if (!homework) return null;

  if (result) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Submitted and marked</h1>
          <p className="mt-2 text-sm text-[var(--ink-dim)] leading-relaxed">{result.note}</p>
        </div>

        <section className="panel p-5">
          <h2 className="text-sm font-medium">What this added</h2>
          <ul className="mt-3 space-y-2.5">
            {result.scores.map((s) => (
              <li key={s.competencyKey} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span>{s.label}</span>
                  <span className="tabular-nums shrink-0">
                    {s.reached ? (
                      <>
                        {Math.round(s.score * 10) / 10}
                        <span className="text-[var(--ink-faint)]">/10</span>
                      </>
                    ) : (
                      <span className="text-[var(--warn)] text-xs">not assessed</span>
                    )}
                  </span>
                </div>
                {s.note && <p className="text-xs text-[var(--ink-faint)] mt-0.5">{s.note}</p>}
              </li>
            ))}
          </ul>
          {result.overallScore !== null && (
            <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--ink-faint)]">
              Your overall score is now {result.overallScore}/100, resting on{" "}
              {result.competenciesCounted} of {result.competenciesTotal} competencies. Where the
              interview and this task both covered a competency, the two are averaged rather than
              added.
            </p>
          )}
        </section>

        <Link href={`/interview/${id}/done`} className="btn inline-block">
          See your full assessment
        </Link>
      </div>
    );
  }

  if (homework.submitted) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Already submitted</h1>
        <p className="text-sm text-[var(--ink-dim)]">
          You submitted this task
          {homework.submittedAt
            ? ` on ${new Date(homework.submittedAt).toLocaleString()}`
            : ""}
          . It has been added to your assessment.
        </p>
        <Link href={`/interview/${id}/done`} className="btn inline-block">
          See your assessment
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <div className="text-xs uppercase tracking-wider text-[var(--ink-faint)]">
          Practical task
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{homework.title}</h1>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="chip">about {homework.estimatedMinutes} minutes</span>
          <span className="chip">no time limit</span>
          <span className="chip">{homework.competencyCount} competencies</span>
        </div>
      </header>

      <div className="panel border-[var(--accent-dim)] p-4 text-sm text-[var(--ink-dim)] leading-relaxed">
        {homework.rationale}
      </div>

      <section className="panel p-6">
        {/* Plain text with paragraph breaks preserved. The brief comes from the
            model and is never rendered as HTML. */}
        <div className="space-y-3 text-sm leading-relaxed whitespace-pre-wrap">
          {homework.brief}
        </div>
      </section>

      <section>
        <label className="text-sm font-medium">Your answer</label>
        <p className="mt-1 text-xs text-[var(--ink-faint)]">
          Brief is fine. You are not scored on length, formatting, or writing style — only on
          the reasoning. Saying &ldquo;I would need to know X, and here is how I would decide
          either way&rdquo; is a good answer, not a dodge.
        </p>
        <textarea
          className="field mt-3 min-h-72 font-mono text-sm leading-relaxed"
          value={text}
          placeholder="Type your answer here…"
          onChange={(e) => setText(e.target.value)}
          onPaste={() => { pasteCount.current += 1; }}
        />
        <div className="mt-1.5 flex justify-between text-xs text-[var(--ink-faint)]">
          <span>Nothing is saved until you submit.</span>
          <span className="tabular-nums">{text.length.toLocaleString()} characters</span>
        </div>
      </section>

      {error && (
        <div className="panel border-[var(--bad)] p-4 text-sm text-[var(--bad)]">
          {error}
          {retryable && (
            <button
              className="btn-ghost ml-3 text-xs"
              onClick={() => void submit()}
              disabled={submitting}
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn" onClick={() => void submit()} disabled={!text.trim() || submitting}>
          {submitting ? "Marking your answer…" : "Submit"}
        </button>
        <Link href={`/interview/${id}/done`} className="text-sm text-[var(--ink-faint)] hover:text-[var(--ink)]">
          Do this later
        </Link>
      </div>
      <p className="text-xs text-[var(--ink-faint)]">
        You can submit once. Marking takes about half a minute.
      </p>
    </div>
  );
}
