import Link from "next/link";

const FLOW = [
  { n: "01", t: "Resume in", d: "Parsed into structured claims, then checked against itself for gaps, overlaps, and skills that are listed but never described." },
  { n: "02", t: "Interview", d: "Questions are generated from that specific resume, and each follow-up reacts to the answer that just arrived." },
  { n: "03", t: "Evidence", d: "Every answer is appraised as it lands: which competency it spoke to, how deep it got, what it actually demonstrated." },
  { n: "04", t: "Profile", d: "A skill diagram, a written assessment, and tags that separate what was demonstrated from what was merely claimed." },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="pt-6">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight max-w-3xl">
          Interviews that actually read the resume.
        </h1>
        <p className="mt-5 text-[var(--ink-dim)] max-w-2xl leading-relaxed">
          HireScope runs a structured, adaptive interview grounded in the candidate&apos;s own
          history, appraises each answer as it arrives, and produces a searchable profile that
          distinguishes demonstrated skill from asserted skill.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/apply" className="btn">Start an interview</Link>
          <Link href="/manager" className="btn-ghost">Search candidates</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {FLOW.map((s) => (
          <div key={s.n} className="panel p-5">
            <div className="text-[var(--accent)] text-xs font-mono">{s.n}</div>
            <div className="mt-2 font-medium">{s.t}</div>
            <p className="mt-2 text-sm text-[var(--ink-dim)] leading-relaxed">{s.d}</p>
          </div>
        ))}
      </section>

      <section className="panel p-6">
        <h2 className="font-medium">What this system does not do</h2>
        <p className="mt-3 text-sm text-[var(--ink-dim)] leading-relaxed max-w-3xl">
          No face detection, gaze tracking, or emotion inference — inferring emotion from a
          candidate in an employment context is prohibited under EU AI Act Art. 5(1)(f), and
          face and eye biometrics trigger BIPA and CUBI consent regimes. No social media
          scraping — assembling third-party information for a hiring decision creates FCRA
          obligations and surfaces exactly the protected characteristics that must never touch
          a decision.
        </p>
        <p className="mt-3 text-sm text-[var(--ink-dim)] leading-relaxed max-w-3xl">
          Integrity is handled with behavioural signals instead: focus loss, paste events,
          answer-timing shape, and register drift across answers. Those catch the real failure
          mode, and none of them require processing anyone&apos;s body.
        </p>
        <Link href="/governance" className="mt-4 inline-block text-sm text-[var(--accent)]">
          Read the governance notes →
        </Link>
      </section>
    </div>
  );
}
