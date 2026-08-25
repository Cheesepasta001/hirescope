"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SkillRadar, round, RADAR_MAX, type RadarPoint } from "@/components/SkillRadar";
import { CandidateCard, recommendationLabel, recommendationColor } from "@/components/CandidateCard";

type Report = {
  candidate: {
    id: string; name: string; email: string; phone: string | null; location: string | null;
    headline: string; yearsExperience: number;
    consent: { interview: boolean; recording: boolean; linkCheck: boolean; at: string | null; policyVersion: string | null };
  };
  interview: { id: string; roleTitle: string; roleSlug: string | null; sector: string; seniority: string; completedAt: string | null; questionCount: number };
  criteria: {
    roleSlug: string; roleTitle: string; version: number;
    sourcePath: string; parsedAt: string; competencyCount: number;
  } | null;
  assessment: {
    overallScore: number; recommendation: string; summary: string;
    competenciesCounted: number; competenciesTotal: number; scoreExplanation: string;
    competencies: RadarPoint[]; strengths: string[]; concerns: string[];
    resumeDeltas: { claim: string; direction: string; detail: string }[];
  };
  homework: {
    title: string; brief: string; rationale: string;
    estimatedMinutes: number; targetKeys: string[]; createdAt: string;
    submission: {
      text: string; submittedAt: string; gradedAt: string | null;
      graderNote: string | null; pasteCount: number;
    } | null;
  } | null;
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

  const { candidate, interview, criteria, assessment, homework, integrity, tags, verification, transcript } = report;
  const demonstrated = tags.filter((t) => t.status === "demonstrated");
  const claimed = tags.filter((t) => t.status === "claimed");
  const contradicted = tags.filter((t) => t.status === "contradicted");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Link href="/manager/candidates" className="text-[var(--accent)]">← All candidates</Link>
        <Link href="/manager" className="text-[var(--ink-faint)] hover:text-[var(--ink)]">Search</Link>
        {/* The record of what was asked, said, and applied — for the hiring file. */}
        <a
          href={`/api/interview/${interview.id}/export`}
          className="ml-auto text-[var(--accent)]"
        >
          Download the record (.md)
        </a>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{candidate.name}</h1>
          <p className="mt-1 text-[var(--ink-dim)]">{candidate.headline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip">{interview.seniority} {interview.roleTitle}</span>
            <span className="chip">{round(candidate.yearsExperience)} yrs</span>
            <span className="chip">{interview.questionCount} questions</span>
            {candidate.location && <span className="chip">{candidate.location}</span>}
          </div>
          <div className="mt-2 text-sm text-[var(--ink-dim)]">
            {candidate.email}
            {candidate.phone && <span className="text-[var(--ink-faint)]"> · {candidate.phone}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-5xl font-semibold tabular-nums">{assessment.overallScore}</div>
          <div className="text-xs uppercase tracking-wider text-[var(--ink-faint)]">
            of 100 · {assessment.competenciesCounted}/{assessment.competenciesTotal} competencies
          </div>
          <div
            className="mt-2 text-sm font-medium"
            style={{ color: recommendationColor(assessment.recommendation) }}
          >
            {recommendationLabel(assessment.recommendation)}
          </div>
        </div>
      </header>

      {/* The decision stays with the reader. Saying so on the artefact they read
          matters more than saying it in a policy document nobody opens. */}
      <div className="panel border-[var(--accent-dim)] p-4 text-xs text-[var(--ink-dim)] leading-relaxed">
        <span className="text-[var(--ink)] font-medium">This is decision support, not a decision.</span>{" "}
        Nothing here advances or rejects anyone. {assessment.scoreExplanation}
        {criteria && (
          <>
            {" "}Assessed against{" "}
            <span className="font-mono text-[var(--ink)]">{criteria.sourcePath}</span> version{" "}
            {criteria.version}, as it stood on {new Date(criteria.parsedAt).toLocaleDateString()} —
            later edits to that file do not change this assessment.
          </>
        )}
      </div>

      <section className="panel p-6">
        <p className="leading-relaxed">{assessment.summary}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[auto_1fr] items-start">
        <div className="panel p-5">
          <h2 className="text-sm font-medium mb-2">Skill diagram</h2>
          <SkillRadar points={assessment.competencies} />
          <p className="mt-2 text-xs text-[var(--ink-faint)] max-w-[380px]">
            Axes come from this role&apos;s criteria file. Hollow markers mark thinly-evidenced
            scores; dashed spokes with no marker are competencies the interview never reached,
            and the shape does not pass through them.
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
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">Competency detail</h2>
          <span className="text-xs text-[var(--ink-faint)]">
            Priority sets the weight: high ×3, medium ×2, low ×1
          </span>
        </div>
        <div className="mt-3 space-y-3">
          {assessment.competencies.map((c) => (
            <div key={c.competencyId} className="border-t border-[var(--border)] pt-3 first:border-0 first:pt-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">
                  {c.label}
                  {c.priority && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                      {c.priority} priority
                    </span>
                  )}
                  {c.source === "homework" && (
                    <span className="ml-2 chip text-[10px] border-[var(--accent-dim)]">homework</span>
                  )}
                </span>
                {c.reached === false ? (
                  <span className="text-xs text-[var(--warn)]">not assessed</span>
                ) : (
                  <span className="text-sm tabular-nums">
                    {round(c.score)}
                    <span className="text-[var(--ink-faint)]">/{RADAR_MAX}</span>
                    <span className={`ml-2 text-xs ${c.confidence === "low" ? "text-[var(--warn)]" : "text-[var(--ink-faint)]"}`}>
                      {c.confidence} confidence
                    </span>
                  </span>
                )}
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

      <section>
        <h2 className="text-sm font-medium mb-3">The card, as it appears in the list</h2>
        <div className="max-w-sm">
          <CandidateCard
            candidate={{
              candidateId: candidate.id,
              name: candidate.name,
              headline: candidate.headline,
              roleTitle: interview.roleTitle,
              seniority: interview.seniority,
              yearsExperience: candidate.yearsExperience,
              overallScore: assessment.overallScore,
              recommendation: assessment.recommendation,
              competenciesCounted: assessment.competenciesCounted,
              competenciesTotal: assessment.competenciesTotal,
              competencies: assessment.competencies,
              contact: {
                email: candidate.email,
                phone: candidate.phone,
                location: candidate.location,
              },
            }}
          />
        </div>
      </section>

      {homework && (
        <section className="panel p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Homework — {homework.title}</h2>
            <span className="text-xs text-[var(--ink-faint)]">
              set for {homework.targetKeys.join(", ") || "no recorded targets"} ·
              {" "}~{homework.estimatedMinutes} min
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            Generated from the competencies the interview left unreached or thinly evidenced.
            Scores from it are averaged with the interview&apos;s, not added to them.
          </p>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-[var(--accent)]">
              The task as the candidate saw it
            </summary>
            <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--ink-dim)] leading-relaxed border-l-2 border-[var(--border)] pl-3">
              {homework.brief}
            </div>
          </details>

          {homework.submission ? (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">Submission</span>
                <span className="text-xs text-[var(--ink-faint)]">
                  {new Date(homework.submission.submittedAt).toLocaleString()}
                  {homework.submission.pasteCount > 0 && (
                    <span className="text-[var(--warn)]">
                      {" "}· {homework.submission.pasteCount} paste
                      {homework.submission.pasteCount === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
              </div>
              {homework.submission.graderNote && (
                <p className="mt-2 text-sm text-[var(--ink-dim)]">{homework.submission.graderNote}</p>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-[var(--accent)]">
                  Read the submission
                </summary>
                <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--ink-dim)] leading-relaxed border-l-2 border-[var(--border)] pl-3">
                  {homework.submission.text}
                </div>
              </details>
            </div>
          ) : (
            <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm text-[var(--ink-faint)]">
              Not submitted yet. The scores above rest on the interview alone.
            </p>
          )}
        </section>
      )}

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
