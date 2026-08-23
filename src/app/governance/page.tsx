const DESIGNED = [
  {
    t: "No emotion or biometric inference",
    d: "The system does not touch camera or microphone. It does not detect faces, track gaze, or infer affect. EU AI Act Art. 5(1)(f) prohibits emotion inference in the workplace outright, and face or eye biometric templates trigger Illinois BIPA and Texas CUBI consent and retention regimes with per-violation statutory damages.",
  },
  {
    t: "No third-party background gathering",
    d: "No social media, no LinkedIn, no people-search aggregators. Assembling third-party information about a candidate to inform a hiring decision makes the gatherer a consumer reporting agency under FCRA, with disclosure, written authorisation, and dispute-resolution duties. Social profiles also surface protected characteristics, which is direct EEOC disparate-impact exposure.",
  },
  {
    t: "Verification stays inside what the candidate gave us",
    d: "Timeline arithmetic, employment overlaps, and skills claimed but never described — all derived from the resume itself. Professional links are checked only when the candidate consents, only for URLs printed on their own resume, and never for personal social accounts.",
  },
  {
    t: "Per-purpose consent, recorded with a version",
    d: "Interview, integrity monitoring, and link verification are separate opt-ins with the policy version and timestamp stored. Declining integrity monitoring does not affect the assessment.",
  },
  {
    t: "Candidate sees their own report",
    d: "The same scores, summary, and findings the manager sees, plus the ability to attach a rebuttal to any verification finding. GDPR Art. 15 access and Art. 22 contest rights, Illinois AIVIA disclosure, and NYC Local Law 144 notice all point the same way.",
  },
  {
    t: "Integrity signals never enter scoring",
    d: "Focus loss and paste events reach the interviewer only as a nudge to ask for a first-hand detail, and reach the manager as a separate advisory band with its caveat attached. They are never an input to any competency score.",
  },
  {
    t: "Stylometry suppresses its own false positives",
    d: "The machine-text check discards any finding whose evidence is equally explained by second-language or formal professional writing. A detector that penalises non-native speakers is a discrimination tool, not an integrity tool.",
  },
  {
    t: "Evidence-bound scoring",
    d: "Every competency score carries a quote and a confidence level. Where the interview did not reach a competency, the report says so instead of producing a confident number.",
  },
];

const REMAINING = [
  {
    t: "Annual bias audit",
    d: "NYC Local Law 144 requires an independent disparate-impact audit of any automated employment decision tool, published, within one year of use. Nothing in this codebase substitutes for it. You will need selection-rate data by race/ethnicity and sex, which means deciding how to collect it lawfully before you launch.",
  },
  {
    t: "Notice periods",
    d: "Local Law 144 requires candidate notice at least ten business days before use. Illinois AIVIA requires consent before AI analysis of a video interview and deletion within 30 days of a request. Maryland requires consent for facial recognition, which this system avoids entirely.",
  },
  {
    t: "EU AI Act high-risk obligations",
    d: "AI systems used for recruitment and candidate evaluation are Annex III high-risk. That brings a risk management system, data governance records, technical documentation, logging, human oversight design, and a conformity assessment. The consent records, plan snapshots, and per-turn appraisals here are the raw material for that documentation, not a substitute for it.",
  },
  {
    t: "Retention and deletion",
    d: "No retention policy is implemented. Decide how long transcripts and assessments live, implement deletion on request, and cascade it — the schema uses onDelete: Cascade so a candidate delete removes resumes, interviews, turns, and tags with it.",
  },
  {
    t: "Real authentication",
    d: "The manager side is gated by a shared passcode and the candidate report by an unguessable URL. Both are demo-grade. Everything behind them is personal data under GDPR Art. 4.",
  },
  {
    t: "Human decision-maker in the loop",
    d: "The system is built as decision support and the language throughout says so, but nothing enforces it. If a score ever auto-rejects a candidate, you are making a solely-automated decision with legal effect under GDPR Art. 22.",
  },
];

export default function GovernancePage() {
  return (
    <div className="max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Governance</h1>
        <p className="mt-2 text-[var(--ink-dim)] leading-relaxed">
          Hiring tools are among the most heavily regulated applications of AI, and the
          regulation is mostly not optional. This page records what the design already handles
          and what is still on you before this touches a real candidate.
        </p>
      </header>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-[var(--ink-faint)]">Handled in the design</h2>
        <div className="mt-4 space-y-4">
          {DESIGNED.map((x) => (
            <div key={x.t} className="panel p-5">
              <div className="flex gap-2 items-baseline">
                <span className="text-[var(--good)]">✓</span>
                <span className="font-medium text-sm">{x.t}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--ink-dim)] leading-relaxed">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-[var(--ink-faint)]">Still required before production</h2>
        <div className="mt-4 space-y-4">
          {REMAINING.map((x) => (
            <div key={x.t} className="panel p-5 border-[var(--warn)]/30">
              <div className="flex gap-2 items-baseline">
                <span className="text-[var(--warn)]">!</span>
                <span className="font-medium text-sm">{x.t}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--ink-dim)] leading-relaxed">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-[var(--ink-faint)] leading-relaxed">
        This is an engineering summary of why the system is built the way it is, not legal
        advice. Jurisdictions differ and these rules are moving quickly — get counsel in your
        target markets before you deploy.
      </p>
    </div>
  );
}
