"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http";

/**
 * The hiring side: asked for the passcode once, at the door.
 *
 * It used to be asked again on every screen — once to search, once to browse —
 * which read as though the two pages were separate products that happened to
 * share a secret. Now the door asks, and everything behind it is open for the
 * rest of the tab.
 *
 * The gate is a courtesy, not the protection. Every route behind it still
 * checks the passcode on its own request, because anyone can edit their own
 * session storage and walk past a check drawn in the browser. What the gate
 * genuinely does is stop the pages loading candidate data before anyone has
 * proved they should see any.
 */

const TABS = [
  { href: "/hire/search", label: "AI Search" },
  { href: "/hire/candidates", label: "All Candidates" },
];

type Gate = "checking" | "locked" | "open";

export default function HireLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [gate, setGate] = useState<Gate>("checking");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (code: string): Promise<boolean> => {
    const res = await fetch("/api/hire/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: code }),
    });
    await readJsonResponse<{ ok: boolean }>(res, "Could not check the passcode.");
    return true;
  }, []);

  // A passcode from earlier in this tab is re-checked rather than trusted, so a
  // changed passcode locks the door again instead of failing later, one
  // confusing request at a time.
  useEffect(() => {
    const saved = sessionStorage.getItem("hs_passcode");
    if (!saved) { setGate("locked"); return; }
    verify(saved)
      .then(() => { setPasscode(saved); setGate("open"); })
      .catch(() => { sessionStorage.removeItem("hs_passcode"); setGate("locked"); });
  }, [verify]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verify(passcode);
      sessionStorage.setItem("hs_passcode", passcode);
      setGate("open");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check the passcode.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    sessionStorage.removeItem("hs_passcode");
    setPasscode("");
    setGate("locked");
  }

  if (gate === "checking") {
    return <p className="text-sm text-[var(--ink-faint)]">Checking…</p>;
  }

  if (gate === "locked") {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl">Hire</h1>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Everything behind this point is candidate personal data. One passcode, shared by
          the hiring team — it is not a login, and it does not tell anyone apart.
        </p>

        <form onSubmit={submit} className="panel mt-6 p-5">
          <label htmlFor="hire-passcode" className="text-sm">Manager passcode</label>
          <div className="mt-3 flex gap-2">
            <input
              id="hire-passcode"
              type="password"
              className="field"
              value={passcode}
              autoFocus
              placeholder="Passcode"
              onChange={(e) => setPasscode(e.target.value)}
            />
            <button className="btn" disabled={busy || !passcode}>
              {busy ? "Checking…" : "Enter"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-[var(--bad)]">{error}</p>}
        </form>

        <p className="mt-4 text-xs text-[var(--ink-faint)]">
          Applying for a role instead?{" "}
          <Link href="/apply" className="text-[var(--accent)]">Start an interview</Link>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <nav aria-label="Hire" className="mb-7 flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={active ? "btn" : "btn-ghost"}
            >
              {t.label}
            </Link>
          );
        })}
        <button
          onClick={signOut}
          className="ml-auto text-xs text-[var(--ink-faint)] hover:text-[var(--ink)] underline underline-offset-2"
        >
          Lock
        </button>
      </nav>
      {children}
    </div>
  );
}
