# HireScope

Resume-grounded adaptive AI interviews, producing an evidence-backed skill profile
and a searchable talent pool.

A candidate uploads a resume. The system parses it into structured claims, checks
it against itself, and builds an interview plan targeting the claims worth
testing. It then runs an adaptive interview where every follow-up reacts to the
answer that just arrived, appraising each answer as it lands. Afterwards it sets
a short practical task aimed at whatever the interview could not reach. What
comes out is a candidate card — a score per competency with the quote behind it,
an overall you can reproduce by hand, and tags that distinguish what the
candidate *demonstrated* from what their resume merely *asserted*.

**What gets assessed is not in the code.** Every competency, its definition, and
its weight come from a markdown file the hiring team writes and edits. The model
reads that standard; it never writes it. And the hire or reject call is never
made here — the system produces evidence and a ranking, and a person decides.

---

## Running it locally

```bash
cd hirescope && npm install && cp .env.example .env
```

Put your `ANTHROPIC_API_KEY` in `.env`, then:

```bash
npm run db:push && npm run db:seed && npm run dev
```

No database to install: the committed schema targets SQLite and `.env.example`
already points at a local file. The deploy flips itself to Postgres in
`render.yaml`, so nothing here needs switching.

Open http://localhost:3000. The seed adds six invented candidates so manager
search has something to return without spending any API calls.

Manager passcode is `MANAGER_PASSCODE` in `.env`, default `letmein`.

`npm run db:postgres` and `npm run db:sqlite` flip the datasource. The provider
is the one setting Prisma will not read from an env var, so it has to be a
script — which is why the deploy runs the flip in its build command rather than
leaving every clone to remember it.

### Try it

- **Candidate flow** — `/apply`, upload `examples/example-resume.txt`, pick a role,
  run the interview, then do the practical task it sets you.
- **Candidate list** — `/manager/candidates`, every assessed candidate ranked by score.
- **Search** — `/manager`, try `Software engineer who has experience with PyTorch`.
- **Records** — open a candidate, then **Download the record**.
- **Governance** — `/governance`, why the system is built this way.

`examples/` has an invented resume and a set of prepared answers, so the whole
path can be walked without inventing material on the spot.

Roles come from `criteria/`. Edit `criteria/development.md`, reload `/apply`, and
the interview changes — no code, no restart. See [criteria/README.md](criteria/README.md).

---

## How it works

```
criteria/<role>.md            the standard, written and owned by the hiring team
   ↓  parseCriteria()        validated, never repaired; a bad file stops the interview
   ↓  resolveCriteria()      versioned by content hash, cached in the database
ResolvedCriteria ───────────────────────────────┐
                                                │
resume file                                     │
   ↓  unpdf / mammoth                           │
raw text                                        │
   ↓  extractResume()        structured claims, skills tagged by how they are asserted
ExtractedResume                                 │
   ↓  checkConsistency()     timeline gaps, overlaps, skills listed but never described
   ↓  buildPlan()  ◄─────────────────────────────┘  freezes the criteria into the plan
InterviewPlan
   ↓  nextTurn() × N         appraise the last answer, then decide the next question
transcript + per-turn appraisals
   ↓  buildAssessment()      0-10 per competency, with a quote behind each
   ↓  computeOverall()       weighted mean of the reached ones, rescaled to 0-100
   ↓  buildIntegrityReport() behavioural signals, kept out of scoring
Assessment + CompetencyScore rows
   ↓  generateHomework()     targets what the interview left unreached or thin
   ↓  gradeHomework()        same criteria, same scale
   ↓  recomputeAssessment()  the one path by which an overall score changes
CandidateProfile + tags + embedding
   ↓  /manager/candidates    ranked cards          → the manager decides
   ↓  search()               NL query → filters → ranked hits
   ↓  /api/.../export        the record, as a file
```

### The adaptive loop

One model call per turn does both jobs: appraise the answer that just arrived,
then decide what to ask next. That mirrors how a human interviewer works — you
evaluate *in order to* decide where to push — and it halves the latency and cost
of doing them separately. See `src/lib/interview/engine.ts`.

The system prompt (interviewer instructions, competency definitions, the resume)
is stable for the whole interview and marked with `cache_control`, so only the
growing transcript tail is charged at full rate.

### The criteria file

**The assessment standard is a markdown file the hiring team owns, not code.**
One file per role in `criteria/`, and a role exists exactly when its file does.
Each competency carries a stable key, a display name, what it means, what a
strong answer looks like, what a weak one looks like, and a priority that sets
its weight in the score.

Three ship, matching the job families in the brief: `development`,
`education-planning`, `b2b-sales`. Format and worked example are in
[criteria/README.md](criteria/README.md); `criteria/_TEMPLATE.md` is the blank.

```bash
npm run criteria:check
```

Validates every file with no database and no API key, and reports the line and
the fix for anything wrong. **The parser never repairs.** No default priority,
no inferred competency, no close-enough key — a file that quietly corrected
itself would stop being the standard the person wrote.

Editing a file changes what the next interview asks about, with no code change
and no restart. It does *not* touch assessments already made: a changed file
hashes differently and becomes a new version, and every interview stays pinned
to the version in force when it started. That is what makes "what standard was
this person held to" answerable months later.

The four general competencies — reasoning, communication, ownership,
collaboration — used to be appended from code to every interview. They are now
written out in each criteria file like any other competency, so they can be
reweighted or removed. Nothing is added behind the editor's back.

### Scoring

Each competency is scored **0–10**. Its priority sets its weight — **high 3,
medium 2, low 1** — and the overall is the weighted mean of the competencies
that were actually *reached*, rescaled to 0–100.

Unreached competencies are **excluded from the mean, not scored zero**, and
every report carries the count the score rests on ("6 of 8 competencies"). The
model does not produce the overall score; `src/lib/assess/scoring.ts` does, and
it is the only place that arithmetic exists.

### Homework

After the interview, a short practical task generated from the role's criteria
and the gaps that interview left. Which competencies it targets is decided
deterministically from the coverage that actually happened, not by the model.

Capped under an hour, clamped in code. It cannot ask for work the company would
otherwise pay for. Graded against the same criteria on the same scale, and where
the interview and the task both covered a competency the two are **averaged, not
added**.

### Records

`GET /api/interview/[id]/export` returns the whole thing as one markdown file —
criteria version applied, consent, full transcript, homework and submission, and
every score with its evidence quote. The database stays the source of truth.

### Evidence, not vibes

Every competency score carries a quote from the candidate and a confidence level.
Where the interview did not reach a competency, the report says so instead of
producing a confident number, and the skill diagram draws those axes with hollow
markers and dashed spokes so a manager can see which parts of the shape are
supported.

Tags carry a `status`: `demonstrated`, `claimed`, or `contradicted`. Search ranks
demonstrated skills roughly twice as heavily as claimed ones.

---

## Two features, deliberately redesigned

You asked for background OSINT and for cheating detection via tone, motion, and
eye movement. Both are built here in the form that ships legally, and the reasons
are in `/governance` and in the module headers.

**Integrity (`src/lib/integrity/`)** — no camera, no microphone, no face, gaze, or
emotion inference. Inferring emotion from a candidate in an employment context is
prohibited outright by EU AI Act Art. 5(1)(f), and face or eye biometrics trigger
Illinois BIPA and Texas CUBI with per-violation statutory damages.

Instead: window focus loss, tab visibility, paste and copy events, answer-timing
shape (a long silence followed by a long answer typed at transcription speed), and
LLM-stylometry across answers. These catch the actual failure mode — the candidate
is reading from a second window — better than gaze tracking does. The stylometry
check discards any finding equally explained by second-language or formal writing,
because a detector that penalises non-native speakers is a discrimination tool.

Integrity signals never enter scoring. They reach the interviewer only as a nudge
to ask for a first-hand detail, and reach the manager as a separate advisory band
with its caveat attached.

**Verification (`src/lib/verify/`)** — no social media, no LinkedIn, no
people-search aggregators. Gathering third-party information about a candidate to
inform a hiring decision makes you a consumer reporting agency under FCRA, with
disclosure, written authorisation, and dispute duties attached. Social profiles
also surface exactly the protected characteristics that must never touch a
decision.

Instead: the resume checked against itself (timeline arithmetic, overlapping
employment, skills claimed but never described), plus verification of professional
links the candidate put on their own resume, under separate consent. Then the part
that actually has teeth — reconciling the resume against whether the person could
talk about their own stated work. `links.ts` refuses LinkedIn and personal social
hosts explicitly, so the refusal shows up in the audit trail rather than looking
like a bug.

---

## Deploying a shareable link

Hosted on a persistent container rather than serverless functions, because this
app's requests are long: resume upload makes two Opus 5 calls back to back, and
the assessment runs at high effort over a full transcript. Serverless per-request
timeouts are the wrong shape for that — Vercel's Hobby tier caps a function at
60s, which upload will exceed on a real resume.

**1. A Postgres database.** [Neon](https://neon.tech) has a free tier. Create a
project and copy the connection string.

**2. Deploy.** `render.yaml` in the repo root is a Render blueprint — in the
Render dashboard choose New → Blueprint and point it at this repo. It builds,
pushes the schema, and starts the server. Railway and Fly.io work the same way
from the same `package.json` scripts.

**3. Set these in the host's environment settings**, never in a committed file:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Your key. Every visitor's interview is billed to it. |
| `DATABASE_URL` | The Postgres connection string. |
| `MANAGER_PASSCODE` | Gates manager search and candidate reports. |
| `INVITE_CODES` | Comma-separated codes required to start an interview. |
| `MAX_INTERVIEWS_PER_DAY` | Hard ceiling, resets midnight UTC. |

### Spend controls

A public ungated link is unbounded spend on your account — one full interview is
roughly a dollar or two of Opus 5, and nothing stops a visitor starting a hundred.
Three independent limits, in `src/lib/gate.ts`:

- **Invite codes.** Checked before any parsing, model call, or database write.
  Unset `INVITE_CODES` leaves the demo open; the candidate form only shows the
  field where codes are actually configured.
- **Daily cap.** Counts interviews *started*, not completed — an abandoned
  interview still spent the extraction and planning calls.
- **Per-interview turn ceiling.** The engine is meant to wind down on its own,
  but intent is not a spend control, so turns hard-stop past the budget.

None of this is authentication. It is spend control for a demo; real auth is
still the open item in `/governance`.

### Free-tier caveat

Render's free instances sleep when idle, so the first visit after a quiet period
waits through a cold start. Fine for a demo link, wrong for anything you want to
feel responsive.

---

## Layout

```
prisma/schema.prisma          data model; Postgres-portable
prisma/seed.ts                six invented candidates, no API calls
criteria/                     THE assessment standard — see criteria/README.md
examples/                     an invented resume and prepared answers for the demo
src/lib/claude.ts             SDK client, model + effort constants, error mapping
src/lib/resume/               text extraction, Zod schema, structured extraction
src/lib/criteria/             the markdown parser and the versioned loader
src/lib/interview/            plan builder, adaptive engine, abandonment rule
src/lib/integrity/            non-biometric signals, stylometry screen
src/lib/verify/               resume self-consistency, consented link checks
src/lib/assess/scoring.ts     THE scoring rule — weights, weighted mean, nothing else
src/lib/assess/score.ts       final assessment, card data, tags
src/lib/assess/recompute.ts   the only path by which an overall score changes
src/lib/homework/             task generation and grading
src/lib/search/query.ts       NL query → filters → ranked hits
src/lib/embeddings.ts         Voyage, with a local lexical fallback
src/app/api/                  apply, turn, signal, finish, report, homework, export,
                              search, candidate(s), roles, config
src/app/                      landing, apply, interview, homework, manager,
                              candidate list, governance
src/components/SkillRadar.tsx skill diagram; axes from the criteria file
src/components/CandidateCard  the card the list and the report share
```

### Model usage

Everything runs on `claude-opus-5` with adaptive thinking. Effort is the cost
dial, set per call site in `src/lib/claude.ts`: interview turns run at `medium` so
they come back fast, the end-of-interview assessment runs at `high` because it is
the artefact a decision gets made from, and query parsing runs at `low`.

Structured outputs are used throughout via `messages.parse()` with Zod schemas —
no output parsing, no retry-on-malformed-JSON. Schemas avoid optional fields on
purpose, using empty strings and zeros instead, which keeps strict mode happy and
stops the model inventing values to fill a slot.

---

## Scaling search

Cosine similarity currently runs in-process over every profile
(`src/lib/search/query.ts`), which is fine into the low thousands of candidates.
Past that, add `pgvector`, change `CandidateProfile.embedding` to a
`Unsupported("vector(1024)")` column, and move the ranking into SQL. The tag
filter is doing most of the ranking work either way.

Set `VOYAGE_API_KEY` for real semantic search. Without it the local lexical
fallback matches words rather than meaning — `PyTorch` will not find `deep
learning framework`. The manager UI says which mode is active.

---

## Status

Working end to end: file-driven criteria with validation, upload, extraction,
consistency checks, frozen plan, adaptive interview, per-turn appraisal,
integrity report, weighted assessment, dynamic skill diagram, tags, homework
generation and grading, the candidate card and ranked list, NL search, manager
report, candidate self-report with rebuttal, and the exportable record.

Not built, and listed with the reasoning in `/governance`: bias audit tooling
(NYC Local Law 144), a retention policy beyond the abandonment rule, real
authentication on both sides, and the EU AI Act Annex III high-risk documentation
set. The consent records, versioned criteria sets, frozen interview plans, and
per-turn appraisals are the raw material for that documentation, but they are not
a substitute for it.

Nothing validates a criteria file for *fairness*. The parser checks that it is
well-formed; whether a competency is a proxy for something protected, or whether
its weak-answer wording penalises a way of speaking rather than a way of
thinking, is a human review this does not do for you. The criteria file is now
the most consequential artefact in the system.

This is an engineering artefact, not legal advice. The rules here are moving
quickly and differ by jurisdiction — get counsel in your target markets before
this touches a real candidate.
