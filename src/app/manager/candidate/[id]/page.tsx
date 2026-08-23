"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SkillRadar, type RadarPoint } from "@/components/SkillRadar";

type Report = {
  candidate: {
    id: string; name: string; email: string; location: string | null;
    headline: string; yearsExperience: number;
    consent: { interview: boolean; recording: boolean; linkCheck: boolean; at: string | null; policyVersion: string | null };
  };
  interview: { roleTitle: string; sector: string; seniority: string; completedAt: string | null; questionCount: number };
  assessment: {
    overallScore: number; recommendation: string; summary: string;
    competencies: RadarPoint[]; strengths: string[]; concerns: string[];
    resumeDeltas: { claim: string; direction: string; detail: string }[];
  };
  integrity: {
    anomalyScore: number; band: string;
    observations: { label: string; detail: string; weight: number }[];
    caveat: string;
  } | null;
  tags: { label: string; kind: string; confidence: number; status: string; evidence: string | null }[];
  verification: { kind: string; severity: string; field: string | null; detail: string }[];
  transcript: { role: string; text: string; competency: string | null; questionType: string | null }[];
};

export default function CandidateReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const passcode = sessionStorage.getItem("hs_passcode") ?? "";
    (async () => {
      try {
        const res = await fetch(`/api/candidate/${id}?passcode=${encodeURIComponent(passcode)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load this report.");
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load this report.");
      }
    })();
  }, [id]);

  if (error) {
    return (
      <div className="panel border-[var(--bad)] p-5">
        <p className="text-sm text-[var(--bad)]">{error}</p>
        <Link href="/manager" className="mt-3 inline-block text-sm text-[var(--accent)]">← Back to search</Link>
      </div>
    );
  }
  if (!report) return <p className="text-sm text-[var(--ink-dim)]">Loading report…</p>;

  const { candidate, interview, assessment, integrity, tags, verification, transcript } = report;
  const demonstrated = tags.filter((t) => t.status === "demonstrated");
  const claimed = tags.filter((t) => t.status === "claimed");
  const contradicted = tags.filter((t) => t.status === "contradicted");

  return (
    <div className="space-y-8">
      <Link href="/manager" className="text-sm text-[var(--accent)]">← Back to search</Link>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{candidate.name}</h1>
          <p className="mt-1 text-[var(--ink-dim)]">{candidate.headline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip">{interview.seniority} {interview.roleTitle}</span>
            <span className="chip">{candidate.yearsExperience} yrs</span>
            <span className="chip">{interview.questionCount} questions</span>
            {candidate.location && <span className="chip">{candidate.location}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-5xl font-semibold tabular-nums">{assessment.overallScore}</div>
          <div className="text-xs uppercase tracking-wider text-[var(--ink-faint)]">interview score</div>
          <div className="mt-2 text-sm font-medium">{assessment.recommendation.replace(/_/g, " ")}</div>
        </div>
      </header>

      <section className="panel p-6">
        <p className="leading-relaxed">{assessment.summary}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[auto_1fr] items-start">
        <div className="panel p-5">
          <h2 className="text-sm font-medium mb-2">Skill diagram</h2>
          <SkillRadar points={assessment.competencies} />
          <p className="mt-2 text-xs text-[var(--ink-faint)] max-w-[380px]">
            Hollow markers and dashed spokes mark axes the interview barely tested. Read those
            scores as provisional.
          </p>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="text-sm font-medium">Strengths</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--ink-dim)]">
              {assessment.strengths.map((s, i) => (
                <li key={i} className="flex gap-2"><span className="text-[var(--good)]">▸</span>{s}</li>
              ))}
            </ul>
          </div>
          <div className="panel p-5">
            <h2 className="text-sm font-medium">Concerns</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--ink-dim)]">
              {assessment.concerns.map((s, i) => (
                <li key={i} className="flex gap-2"><span className="text-[var(--warn)]">▸</span>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-medium">Competency detail</h2>
        <div className="mt-3 space-y-3">
          {assessment.competencies.map((c) => (
            <div key={c.competencyId} className="border-t border-[var(--border)] pt-3 first:border-0 first:pt-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{c.label}</span>
                <span className="text-sm tabular-nums">
                  {c.score}
                  <span className={`ml-2 text-xs ${c.confidence === "low" ? "text-[var(--warn)]" : "text-[var(--ink-faint)]"}`}>
                    {c.confidence} confidence
                  </span>
                </span>
              </div>
              {c.note && <p className="mt-1 text-sm text-[var(--ink-dim)]">{c.note}</p>}
              {c.evidence && (
                <p className="mt-1.5 text-xs text-[var(--ink-faint)] border-l-2 border-[var(--border)] pl-3 italic">
                  {c.evidence}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-medium">Tags</h2>
        <p className="mt-1 text-xs text-[var(--ink-faint)]">
          These are what search matches on. Demonstrated means an interview answer evidenced it.
        </p>
        <TagGroup title="Demonstrated in interview" tags={demonstrated} tone="good" />
        <TagGroup title="Claimed on resume, untested" tags={claimed} tone="dim" />
        {contradicted.length > 0 && <TagGroup title="Contradicted by answers" tags={contradicted} tone="bad" />}
      </section>

      {assessment.resumeDeltas.length > 0 && (
        <section className="panel p-5">
          <h2 className="text-sm font-medium">Resume vs. interview</h2>
          <div className="mt-3 space-y-3">
            {assessment.resumeDeltas.map((d, i) => (
              <div key={i} className="text-sm">
                <span className={`chip mr-2 ${
                  d.direction === "exceeded" ? "border-[var(--good)] text-[var(--good)]"
                  : d.direction === "undercut" ? "border-[var(--bad)] text-[var(--bad)]"
                  : "text-[var(--ink-faint)]"}`}>{d.direction}</span>
                <span className="text-[var(--ink-dim)]">{d.claim}</span>
                <p className="mt-1 text-xs text-[var(--ink-faint)]">{d.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {verification.length > 0 && (
        <section className="panel p-5">
          <h2 className="text-sm font-medium">Verification findings</h2>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            Derived from the resume itself and from links the candidate supplied. No external
            search or social media was used. The candidate can see and contest each item.
          </p>
          <div className="mt-3 space-y-2">
            {verification.map((f, i) => (
              <div key={i} className="text-sm flex gap-3">
                <span className={`chip shrink-0 ${
                  f.severity === "high" ? "border-[var(--bad)] text-[var(--bad)]"
                  : f.severity === "medium" ? "border-[var(--warn)] text-[var(--warn)]"
                  : "text-[var(--ink-faint)]"}`}>{f.kind.replace(/_/g, " ")}</span>
                <span className="text-[var(--ink-dim)]">{f.detail}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {integrity && (
        <section className="panel p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Session integrity</h2>
            <span className={`chip ${
              integrity.band === "review_required" ? "border-[var(--bad)] text-[var(--bad)]"
              : integrity.band === "worth_review" ? "border-[var(--warn)] text-[var(--warn)]"
              : "text-[var(--ink-faint)]"}`}>
              {integrity.band.replace(/_/g, " ")} · {integrity.anomalyScore}/100
            </span>
          </div>
          {integrity.observations.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ink-dim)]">Nothing notable was observed.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {integrity.observations.map((o, i) => (
                <div key={i} className="text-sm">
                  <span className="text-[var(--ink)]">{o.label}</span>
                  <p className="text-xs text-[var(--ink-faint)] mt-0.5">{o.detail}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-[var(--ink-faint)] leading-relaxed border-t border-[var(--border)] pt-3">
            {integrity.caveat}
          </p>
        </section>
      )}

      <section className="panel p-5">
        <h2 className="text-sm font-medium">Consent record</h2>
        <div className="mt-2 grid gap-1 text-sm text-[var(--ink-dim)] sm:grid-cols-2">
          <div>AI interview and assessment: {yn(candidate.consent.interview)}</div>
          <div>Session integrity monitoring: {yn(candidate.consent.recording)}</div>
          <div>Link verification: {yn(candidate.consent.linkCheck)}</div>
          <div>
            Recorded: {candidate.consent.at ? new Date(candidate.consent.at).toLocaleString() : "—"}
            {candidate.consent.policyVersion ? ` (policy ${candidate.consent.policyVersion})` : ""}
          </div>
        </div>
      </section>

      <section>
        <button className="btn-ghost" onClick={() => setShowTranscript((v) => !v)}>
          {showTranscript ? "Hide" : "Show"} full transcript
        </button>
        {showTranscript && (
          <div className="mt-4 space-y-4">
            {transcript.map((t, i) => (
              <div key={i} className="text-sm">
                <div className="text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                  {t.role}{t.competency ? ` · ${t.competency}` : ""}
                </div>
                <p className={`mt-1 whitespace-pre-wrap leading-relaxed ${
                  t.role === "interviewer" ? "text-[var(--ink)]" : "text-[var(--ink-dim)]"}`}>
                  {t.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TagGroup({ title, tags, tone }: {
  title: string;
  tags: { label: string; confidence: number; evidence: string | null }[];
  tone: "good" | "dim" | "bad";
}) {
  if (tags.length === 0) return null;
  const cls = tone === "good" ? "border-[var(--good)] text-[var(--good)]"
    : tone === "bad" ? "border-[var(--bad)] text-[var(--bad)]"
    : "text-[var(--ink-faint)]";
  return (
    <div className="mt-4">
      <div className="text-xs text-[var(--ink-faint)] uppercase tracking-wider">{title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t.label} className={`chip ${cls}`} title={t.evidence ?? undefined}>
            {t.label}<span className="opacity-60 tabular-nums">{Math.round(t.confidence * 100)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const yn = (v: boolean) => (v ? "given" : "declined");
