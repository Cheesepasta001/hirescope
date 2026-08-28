import Link from "next/link";

/**
 * The front door. Two ways in, and nothing else on the page.
 *
 * Almost everyone arriving is one of two people: someone applying for a role,
 * or someone hiring for one. The page used to open with a pitch and put those
 * two paths below it as ordinary links, which meant both audiences had to read
 * marketing copy before finding the thing they came for. The claims that were
 * in that pitch — what the system will not do, and why — are on /governance,
 * where they can be stated properly rather than in a hero.
 */

const DOORS = [
  {
    href: "/apply",
    kicker: "Applicant",
    title: "Start an Interview",
    body:
      "Upload your resume and pick a role. The questions come from your own history, "
      + "and you can see and contest whatever is written about you afterwards.",
    cta: "APPLY",
    primary: true,
  },
  {
    href: "/hire/search",
    kicker: "Hiring team",
    title: "Search Candidates",
    body:
      "Ask in plain English, or browse everyone assessed so far. Every score carries "
      + "the answer it came from. Requires the manager passcode.",
    cta: "SIGN IN",
    primary: false,
  },
];

export default function Home() {
  return (
    <div className="py-6">
      <div className="text-center">
        <h1 className="wordmark">
          HIRE<br />SCOPE
        </h1>
        <p className="ui mt-6 text-sm text-[var(--ink-dim)]">
          Every judgment leaves a record.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {DOORS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className={`panel group block p-7 transition-none ${
              d.primary ? "pixel-frame--warm" : ""
            }`}
          >
            <div className="ui text-[11px] uppercase tracking-[.2em] text-[var(--ink-faint)]">
              {d.kicker}
            </div>
            <h2 className="mt-3 text-xl text-[var(--ink)] group-hover:text-[var(--accent)]">
              {d.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--ink-dim)]">{d.body}</p>
            <span className="ui mt-7 inline-block text-sm text-[var(--accent)]">
              {d.cta} <span aria-hidden="true">▸</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="mx-auto mt-12 max-w-2xl text-center text-sm leading-relaxed text-[var(--ink-dim)]">
        An AI asks the questions and scores the answers against a standard the hiring team
        wrote. A person makes the call — the record survives either way.{" "}
        <Link href="/governance" className="text-[var(--accent)]">
          What it will not do
        </Link>
        .
      </p>
    </div>
  );
}
