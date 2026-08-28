"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HireRoom } from "@/components/HireRoom";

type Hit = {
  candidateId: string;
  name: string;
  headline: string;
  sector: string;
  seniority: string;
  yearsExperience: number;
  overallScore: number;
  recommendation: string;
  summary: string;
  matchScore: number;
  matchedTags: { label: string; confidence: number; status: string }[];
};

type Result = {
  interpretation: string;
  requiredTags: string[];
  niceToHaveTags: string[];
  hits: Hit[];
  semanticQuality: string;
};

const EXAMPLES = [
  "Software engineer who has experience with PyTorch",
  "Backend engineer who has worked on payments",
  "Curriculum lead who has redesigned a course on evidence",
  "Enterprise seller who knows their own conversion numbers",
];

export default function ManagerPage() {
  const [passcode, setPasscode] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPasscode(sessionStorage.getItem("hs_passcode") ?? "");
  }, []);

  async function run(q: string) {
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, passcode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed.");
      sessionStorage.setItem("hs_passcode", passcode);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Find candidates</h1>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            Describe who you need in plain English. Results are ranked on skills the interview
            actually evidenced, not on what a resume asserted.
          </p>
        </div>
        <Link href="/hire/candidates" className="btn-ghost text-sm">Browse all candidates</Link>
      </div>

      {/* The room is a reading of the result, not decoration beside it: the
          chairs hold the current top matches, and an empty chair means the
          query genuinely found fewer people rather than that the row ran out
          of space. Scores sit under the chairs, so it reads as a ranking. */}
      <div className="mt-6">
        <HireRoom
          searching={busy}
          occupants={(result?.hits ?? []).map((h, i) => ({
            name: h.name,
            // The match score, not the overall score: the chairs are ordered by
            // match, so labelling them with the overall made the row look
            // unsorted. The overall still leads each result card below.
            score: h.matchScore,
            top: i === 0,
          }))}
          label={
            busy
              ? "검색 중입니다"
              : result
                ? `검색 결과 상위 ${Math.min(result.hits.length, 5)}명이 자리에 앉아 있습니다`
                : "빈 면접실입니다. 검색하면 후보가 자리에 앉습니다"
          }
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          className="field" placeholder="Software engineer who has experience with PyTorch"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void run(query); }}
        />
        <input
          className="field sm:w-40" type="password" placeholder="Passcode"
          value={passcode} onChange={(e) => setPasscode(e.target.value)}
        />
        <button className="btn" onClick={() => void run(query)} disabled={busy || !query.trim()}>
          {busy ? "Searching…" : "Search"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} className="chip text-[var(--ink-dim)] hover:text-[var(--ink)]"
            onClick={() => { setQuery(ex); void run(ex); }}>
            {ex}
          </button>
        ))}
      </div>

      {error && <div className="mt-6 panel border-[var(--bad)] p-4 text-sm text-[var(--bad)]">{error}</div>}

      {result && (
        <div className="mt-8 space-y-5">
          <div className="panel p-4">
            <div className="text-sm">{result.interpretation}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.requiredTags.map((t) => (
                <span key={t} className="chip border-[var(--accent-dim)] text-[var(--accent)]">required: {t}</span>
              ))}
              {result.niceToHaveTags.map((t) => (
                <span key={t} className="chip text-[var(--ink-dim)]">bonus: {t}</span>
              ))}
            </div>
            {result.semanticQuality === "local_lexical" && (
              <p className="mt-2 text-xs text-[var(--ink-faint)]">
                Running on the local lexical embedding fallback — set VOYAGE_API_KEY for
                meaning-based matching rather than word overlap.
              </p>
            )}
          </div>

          {result.hits.length === 0 ? (
            <p className="text-sm text-[var(--ink-dim)]">
              No candidates matched. If a required skill was too specific, try dropping it.
            </p>
          ) : (
            result.hits.map((h) => (
              <Link key={h.candidateId} href={`/hire/candidate/${h.candidateId}`}
                className="panel block p-5 hover:border-[var(--accent-dim)] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{h.name}</div>
                    <div className="text-sm text-[var(--ink-dim)]">{h.headline}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-semibold tabular-nums">{h.matchScore}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">match</div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-[var(--ink-dim)] leading-relaxed">{h.summary}</p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="chip">{h.seniority}</span>
                  <span className="chip">{h.yearsExperience} yrs</span>
                  <span className="chip">interview {h.overallScore}/100</span>
                  <span className={`chip ${recColor(h.recommendation)}`}>{h.recommendation.replace(/_/g, " ")}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {h.matchedTags.slice(0, 10).map((t) => (
                    <span key={t.label}
                      className={`chip ${t.status === "demonstrated" ? "border-[var(--good)] text-[var(--good)]" : "text-[var(--ink-faint)]"}`}>
                      {t.label}
                      <span className="opacity-60">{t.status === "demonstrated" ? "shown" : "claimed"}</span>
                    </span>
                  ))}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function recColor(rec: string): string {
  if (rec === "strong_yes" || rec === "yes") return "border-[var(--good)] text-[var(--good)]";
  if (rec === "leaning_yes") return "border-[var(--warn)] text-[var(--warn)]";
  if (rec === "no") return "border-[var(--bad)] text-[var(--bad)]";
  return "text-[var(--ink-faint)]";
}
