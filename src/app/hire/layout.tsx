"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The hiring side: one place, two ways in.
 *
 * AI Search answers a question. All Candidates lets you browse the whole pool.
 * They were separate top-level tabs before, which made them look like unrelated
 * features when they are two readings of the same table — so they sit together
 * here and the nav carries one word instead of two.
 *
 * The candidate detail page lives under /hire too but is not a tab: it is
 * somewhere you arrive from either of these, and giving it a tab would suggest
 * you can open it without picking a person first.
 */
const TABS = [
  { href: "/hire/search", label: "AI Search", hint: "평범한 문장으로 묻기" },
  { href: "/hire/candidates", label: "All Candidates", hint: "전체 목록 훑기" },
];

export default function HireLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <nav aria-label="Hire" className="mb-7 flex flex-wrap items-end gap-2">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={active ? "btn" : "btn-ghost"}
              title={t.hint}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
