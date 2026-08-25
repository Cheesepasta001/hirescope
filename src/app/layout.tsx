import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "HireScope",
  description:
    "Resume-grounded AI interviews with a searchable, evidence-backed talent pool.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight text-lg">
              Hire<span className="text-[var(--accent)]">Scope</span>
            </Link>
            <nav className="flex gap-5 text-sm text-[var(--ink-dim)]">
              <Link href="/apply" className="hover:text-[var(--ink)]">
                Interview
              </Link>
              <Link href="/manager" className="hover:text-[var(--ink)]">
                Search
              </Link>
              <Link
                href="/manager/candidates"
                className="hover:text-[var(--ink)]"
              >
                Candidates
              </Link>
              <Link href="/governance" className="hover:text-[var(--ink)]">
                Governance
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-[var(--ink-faint)]">
          Assessments are decision support, not decisions. Every score is
          reviewable, every candidate can see and contest their own report.
        </footer>
      </body>
    </html>
  );
}
