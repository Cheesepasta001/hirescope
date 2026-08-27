const DESIGNED = [
  {
    t: "The standard is written by people, and the system will not write it",
    d: "Every competency assessed, its description, what a strong and a weak answer look like, and how much it weighs all come from a markdown file in criteria/ that the hiring team owns and edits. The model reads that file. It never writes it, extends it, or fills in a competency it thinks is missing, and a malformed file stops the interview with the line number rather than being quietly repaired — a standard that edits itself is no longer the standard anyone agreed to.",
  },
  {
    t: "The standard is frozen before the candidate answers",
    d: "An interview is pinned to the version of the criteria file that was in force when it started, and so is its assessment. Editing the file afterwards creates a new version and moves nothing already recorded. Months later, 'what standard was this person actually held to' has an answer, which is both what a Local Law 144 bias audit needs to inspect and what a hiring record has to survive.",
  },
  {
    t: "The score is arithmetic you can check by hand",
    d: "Each competency is scored 0-10 against the criteria file. Its priority there sets its weight — high 3, medium 2, low 1 — and the overall is the weighted mean of the competencies that were actually reached, rescaled to 0-100. The model does not produce the overall score; one function computes it. Every report states the arithmetic in words and how many competencies the number rests on.",
  },
  {
    t: "Unreached competencies are reported, not scored",
    d: "A competency the interview never tested is excluded from the mean rather than counted as zero, and both the skill diagram and the card say so. Scoring an untested competency zero would punish a candidate for the interview's coverage gaps, and a diagram that draws absence identically to failure is the usual way these summaries mislead.",
  },
  {
    t: "Homework is bounded, and is not unpaid work",
    d: "The practical task is capped under an hour, clamped in code rather than left to the prompt, and cannot ask for work the company would otherwise pay for or for tools a candidate might not have. It targets the competencies the interview left thin, chosen deterministically from that interview's own coverage. Where the interview and the task both cover a competency, the two scores are averaged rather than added.",
  },
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
    d: "Interview, integrity monitoring, link verification, and consideration for other roles are separate opt-ins, each with the policy version and timestamp stored. Declining integrity monitoring does not affect the assessment; declining cross-role consideration only means the compare control is unavailable, and the manager is told why rather than seeing it silently missing.",
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
  {
    t: "Cross-role reads are secondary, consented, and never volunteered",
    d: "A manager can ask how a candidate's existing interview reads against a different role, which avoids putting someone through a second interview to answer a question about the first. Three constraints hold it in place. It runs only where the candidate ticked “also consider me for other roles”, recorded per-purpose with a timestamp like every other consent here. The system never initiates it, never suggests a role, and never reassigns anyone — the manager asks, the system answers with whatever the transcript supports. And nothing it produces touches the ranked list, the profile score, or the recommendation, because a score derived from questions that were never asked must not move the primary ranking.",
  },
  {
    t: "A cross-role score is refused when the overlap is too thin",
    d: "A score carries between roles only where the two criteria files define a competency identically; everything else is re-read from the transcript, and marked as having no evidence where the transcript says nothing. Because the general competencies are shared across every role, they alone reach about half of any role's weight while saying nothing about fit for it — so an overall number is withheld unless at least two role-specific competencies were evidenced and the evidence covers 60% of the role's weight. Below that the per-competency detail is shown with no number and the reason stated. Declining to answer is the correct output, not a limitation.",
  },
  {
    t: "A record that leaves the system",
    d: "Every interview exports as a single file: the criteria file and version applied, the consent record, the full transcript, the homework and its submission, and every score with the quote behind it. The database stays the source of truth; the export is a view of it, generated on request, for attaching to a hiring file.",
  },
  {
    t: "An abandoned attempt is deleted, a hiring record is not",
    d: "A candidate who walks away mid-interview is offered one retry when they return, with the deletion date stated. Declining deletes their resume and session and cascades through it. A candidate who has any completed assessment is never purged this way — discarding an attempt nobody finished and destroying a hiring record are deliberately not the same code path.",
  },
];

/**
 * The client's stated constraint, and the one thing on this page that is not a
 * regulatory citation: they said the hire/reject call stays with a human. It is
 * separated out because it is a design commitment rather than a compliance
 * measure, and because burying it in a list of eight would understate it.
 */
const HUMAN_DECISION = [
  "The system produces a ranked list, a score, a recommendation, and the evidence behind each. It does not advance, reject, shortlist, or auto-reply to anyone.",
  "Nothing is hidden from the manager on the basis of a score. The candidate list defaults to everyone; filtering is the reader's explicit choice and the header always says how many were filtered out.",
  "Ranking is the only relative judgement anywhere in the system. A candidate's own recommendation is derived from their own evidence alone, so it cannot move because somebody else applied.",
  "Cross-role fit is asked for, never offered. The system does not scan the pool for better-suited people, does not suggest a role, and does not move anyone between roles. A manager who wants that question answered has to ask it about a named candidate and a named role.",
  "The recommendation is a chip on a card, never a gate. 'Insufficient evidence' is a real option and is applied automatically when no competency was reached.",
  "Both the manager report and the candidate's own copy say on the page that this is decision support and that a person makes the call.",
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
    t: "Retention beyond abandonment",
    d: "Abandoned attempts are handled — offered a retry, then deleted after 72 hours. Nothing else is. Decide how long completed transcripts and assessments live, implement deletion on request, and run it on a schedule; the purge script exists but this app has no scheduler and deliberately does not invent one. The schema uses onDelete: Cascade, so a candidate delete already removes resumes, interviews, turns, homework, and tags with it.",
  },
  {
    t: "Cross-role reads are not audited as a selection tool",
    d: "If cross-role reads ever influence who gets contacted, they are part of the selection process and fall inside the same bias-audit and notice obligations as the primary assessment — they are not a separate, lighter thing because they are labelled secondary. Nothing here tracks how often they are requested, for which candidates, or with what effect on outcomes. That instrumentation is the prerequisite for auditing them at all.",
  },
  {
    t: "Nobody validates a criteria file for fairness",
    d: "The parser enforces that a criteria file is well-formed. It cannot tell you whether a competency is a proxy for something protected, whether the weighting favours a background, or whether the wording of a weak-answer description penalises a way of speaking rather than a way of thinking. The file is now the most consequential artefact in the system, and reviewing what goes in it is a human job that nothing here does for you.",
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
        <p className="mt-3 text-sm text-[var(--ink-faint)] leading-relaxed">
          Two things about this system are worth knowing before the rest: the assessment
          standard is a file the hiring team writes, not something the model decides, and the
          hire or reject decision is never made here.
        </p>
      </header>

      <section className="panel border-[var(--accent-dim)] p-6">
        <h2 className="font-medium">Where the human decision sits</h2>
        <p className="mt-2 text-sm text-[var(--ink-dim)] leading-relaxed">
          The client was explicit that the hire or reject call is theirs, and that the problem
          was never having the time or the record to make it well. So the system spends its
          effort on producing evidence and leaves the call alone.
        </p>
        <ul className="mt-4 space-y-2.5">
          {HUMAN_DECISION.map((x) => (
            <li key={x} className="flex gap-2.5 text-sm text-[var(--ink-dim)] leading-relaxed">
              <span className="text-[var(--accent)] shrink-0">▸</span>
              {x}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--ink-faint)] leading-relaxed">
          None of this is enforced by anything other than the code being written this way. If a
          score is ever wired to auto-reject, that becomes a solely-automated decision with legal
          effect under GDPR Art. 22 — see the list below.
        </p>
      </section>

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
