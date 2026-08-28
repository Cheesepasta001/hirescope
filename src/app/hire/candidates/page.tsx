"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CandidateCard, type CardCandidate } from "@/components/CandidateCard";
import type { RadarPoint } from "@/components/SkillRadar";
import { readJsonResponse } from "@/lib/http";

/**
 * The candidate list — every assessed candidate as a card, ranked by score.
 *
 * This is a way to *browse*, alongside the natural-language search on /hire/search
 * rather than instead of it. Search answers "who has done X"; this answers "who
 * is here", which is the question a recruiter with twenty open applications
 * actually starts from.
 */

type Listed = CardCandidate & {
  roleSlug: string | null;
  sector: string;
  assessedAt: string;
};

type Payload = {
  candidates: Listed[];
  shown: number;
  totalUnfiltered: number;
  roles: { roleSlug: string; roleTitle: string }[];
};

const SENIORITIES = ["junior", "mid", "senior", "lead"];

const RECOMMENDATIONS = [
  ["strong_yes", "Strong yes"],
  ["yes", "Yes"],
  ["leaning_yes", "Leaning yes"],
  ["no", "No"],
  ["insufficient_evidence", "Insufficient evidence"],
];

export default function CandidateListPage() {
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roleSlug, setRoleSlug] = useState("");
  const [seniority, setSeniority] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [minScore, setMinScore] = useState(0);

  const load = useCallback(
    async (code: string) => {
      if (!code) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passcode: code, roleSlug, seniority, recommendation, minScore }),
        });
        const body = await readJsonResponse<Payload>(res, "Could not load candidates.");
        sessionStorage.setItem("hs_passcode", code);
        setData(body);
        setUnlocked(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load candidates.");
      } finally {
        setBusy(false);
      }
    },
    [roleSlug, seniority, recommendation, minScore],
  );

  // A passcode already entered on the search page carries over.
  useEffect(() => {
    const saved = sessionStorage.getItem("hs_passcode") ?? "";
    setPasscode(saved);
    if (saved) void load(saved);
    // Intentionally once on mount; filter changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (unlocked) void load(passcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleSlug, seniority, recommendation, minScore]);

  const filtered = Boolean(roleSlug || seniority || recommendation || minScore);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
          <p className="mt-1.5 text-sm text-[var(--ink-dim)] max-w-2xl">
            Everyone with a completed assessment, ranked by overall score. Scores rank; they do
            not decide. Nobody is hidden here because they scored badly.
          </p>
        </div>
      </header>

      {!unlocked && (
        <form
          className="panel p-5 max-w-md"
          onSubmit={(e) => { e.preventDefault(); void load(passcode); }}
        >
          <label className="text-sm font-medium">Manager passcode</label>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            Everything past this point is candidate personal data.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="password" className="field" value={passcode} placeholder="Passcode"
              onChange={(e) => setPasscode(e.target.value)}
            />
            <button className="btn" disabled={busy || !passcode}>
              {busy ? "…" : "Open"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-[var(--bad)]">{error}</p>}
        </form>
      )}

      {unlocked && data && (
        <>
          <section className="panel p-4 flex flex-wrap items-end gap-4">
            <Filter label="Role">
              <select className="field" value={roleSlug} onChange={(e) => setRoleSlug(e.target.value)}>
                <option value="">Any role</option>
                {data.roles.map((r) => (
                  <option key={r.roleSlug} value={r.roleSlug}>{r.roleTitle}</option>
                ))}
              </select>
            </Filter>

            <Filter label="Level">
              <select className="field" value={seniority} onChange={(e) => setSeniority(e.target.value)}>
                <option value="">Any level</option>
                {SENIORITIES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </Filter>

            <Filter label="Recommendation">
              <select
                className="field" value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
              >
                <option value="">Any</option>
                {RECOMMENDATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Filter>

            <Filter label={`Minimum score: ${minScore}`}>
              <input
                type="range" min={0} max={100} step={5} value={minScore}
                className="w-40 accent-[var(--accent)]"
                onChange={(e) => setMinScore(Number(e.target.value))}
              />
            </Filter>

            {filtered && (
              <button
                className="btn-ghost text-sm ml-auto"
                onClick={() => {
                  setRoleSlug(""); setSeniority(""); setRecommendation(""); setMinScore(0);
                }}
              >
                Clear filters
              </button>
            )}
          </section>

          <div className="flex items-baseline justify-between text-sm">
            <span className="text-[var(--ink-dim)]">
              {data.shown === data.totalUnfiltered
                ? `${data.shown} candidate${data.shown === 1 ? "" : "s"}`
                : `${data.shown} of ${data.totalUnfiltered} candidates`}
            </span>
            {busy && <span className="text-xs text-[var(--ink-faint)]">Updating…</span>}
          </div>

          {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

          {data.candidates.length === 0 ? (
            <div className="panel p-8 text-center">
              <p className="text-sm text-[var(--ink-dim)]">
                {data.totalUnfiltered === 0
                  ? "No candidate has completed an interview yet."
                  : "No candidate matches these filters."}
              </p>
              <p className="mt-2 text-xs text-[var(--ink-faint)]">
                {data.totalUnfiltered === 0 ? (
                  <>
                    Run <Link href="/apply" className="text-[var(--accent)]">an interview</Link>, or
                    seed the demo corpus with <code>npm run db:seed</code>.
                  </>
                ) : (
                  <>
                    {data.totalUnfiltered} candidate{data.totalUnfiltered === 1 ? " is" : "s are"} in
                    the pool. Widen the filters to see them.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
              {data.candidates.map((c, i) => (
                <div key={c.candidateId} className="relative">
                  {/* Rank is shown because the list is ordered, and an ordered list
                      whose ordering is invisible invites the reader to invent one. */}
                  <span className="absolute -top-2 -left-2 z-10 chip bg-[var(--bg)] text-[10px] tabular-nums">
                    #{i + 1}
                  </span>
                  <CandidateCard
                    candidate={{ ...c, competencies: c.competencies as RadarPoint[] }}
                    href={`/hire/candidate/${c.candidateId}`}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-[var(--ink-faint)]">
      <span className="block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
