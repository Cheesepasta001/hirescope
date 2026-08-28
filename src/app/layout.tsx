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
      <head>
        {/* VT323 carries the app's chrome. Google Fonts is the one external
            host the artifact CSP admits, and it is what DEMO uses. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <header className="border-b border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight text-lg">
              Hire<span className="text-[var(--accent)]">Scope</span>
            </Link>
            {/* Three doors, not four. Search and Candidates were two ways of
                reading the same table, so they sit behind Hire together. */}
            <nav className="flex gap-5 text-sm text-[var(--ink-dim)]">
              <Link href="/apply" className="hover:text-[var(--ink)]" title="이력서 업로드 후 면접">
                Apply
              </Link>
              <Link href="/hire/search" className="hover:text-[var(--ink)]" title="지원자 찾기">
                Hire
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
