# HireScope

Resume-grounded adaptive AI interviews, producing an evidence-backed skill profile
and a searchable talent pool.

A candidate uploads a resume. The system parses it into structured claims, checks
it against itself, and builds an interview plan targeting the claims worth
testing. It then runs an adaptive interview where every follow-up reacts to the
answer that just arrived. Each answer is appraised as it lands. At the end you get
a skill diagram, a written assessment, and tags that distinguish what the
candidate *demonstrated* from what their resume merely *asserted* — which is what
makes manager search worth anything.

---

## Running it

```bash
cd hirescope && npm install
```

Put an API key in `.env` (copy `.env.example` if it is missing):

```
ANTHROPIC_API_KEY=sk-ant-...
```

Then:

```bash
npm run db:push && npm run db:seed && npm run dev
```

Open http://localhost:3000. The seed adds six invented candidates so manager
search has something to return without spending any API calls.

Manager passcode is `MANAGER_PASSCODE` in `.env`, default `letmein`.

### Try it

- **Candidate flow** — `/apply`, upload a PDF or DOCX resume, run the interview.
- **Manager flow** — `/manager`, search `Software engineer who has experience with PyTorch`.
- **Governance** — `/governance`, why the system is built this way.

---

## How it works

```
resume file
   ↓  unpdf / mammoth
raw text
   ↓  extractResume()        structured claims, skills tagged by how they are asserted
ExtractedResume
   ↓  checkConsistency()     timeline gaps, overlaps, skills listed but never described
   ↓  buildPlan()            competency targets + resume probes, frozen for the interview
InterviewPlan
   ↓  nextTurn() × N         appraise the last answer, then decide the next question
transcript + per-turn appraisals
   ↓  buildAssessment()      competency scores with quoted evidence, tags, resume deltas
   ↓  buildIntegrityReport() behavioural signals, kept out of scoring
CandidateProfile + tags + embedding
   ↓  search()               NL query → structured filter → ranked hits
```

### The adaptive loop

One model call per turn does both jobs: appraise the answer that just arrived,
then decide what to ask next. That mirrors how a human interviewer works — you
evaluate *in order to* decide where to push — and it halves the latency and cost
of doing them separately. See `src/lib/interview/engine.ts`.

The system prompt (interviewer instructions, competency definitions, the resume)
is stable for the whole interview and marked with `cache_control`, so only the
growing transcript tail is charged at full rate.

### Sectors

Ten sectors ship with their own competency frameworks — engineering, finance, HR,
sales, product, healthcare, legal, operations, marketing, and a general fallback.
Each defines what a strong answer looks like *and* what a weak one looks like, and
both halves are fed to the question generator and the scorer. Add a sector by
adding an entry to `SECTORS` in `src/lib/interview/sectors.ts`; nothing else needs
to change.

Every interview also covers four universal competencies — logical reasoning,
communication, ownership, collaboration — because those are what cross-candidate
comparison actually runs on.

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

## Layout

```
prisma/schema.prisma          data model; Postgres-portable
prisma/seed.ts                six invented candidates, no API calls
src/lib/claude.ts             SDK client, model + effort constants, error mapping
src/lib/resume/               text extraction, Zod schema, structured extraction
src/lib/interview/            sector frameworks, plan builder, adaptive engine
src/lib/integrity/            non-biometric signals, stylometry screen
src/lib/verify/               resume self-consistency, consented link checks
src/lib/assess/score.ts       final assessment, skill diagram data, tags
src/lib/search/query.ts       NL query → filters → ranked hits
src/lib/embeddings.ts         Voyage, with a local lexical fallback
src/app/api/                  apply, turn, signal, finish, report, search, candidate
src/app/                      landing, apply, interview, manager, governance
src/components/SkillRadar.tsx skill diagram; draws confidence, not just score
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

## Moving to Postgres

The schema is written to be portable — no SQLite-only types, and embeddings are
stored as JSON text rather than a `pgvector` column.

1. In `prisma/schema.prisma`, set `provider = "postgresql"`.
2. Point `DATABASE_URL` at your instance.
3. `npm run db:push`

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

Working end to end: upload, extraction, consistency checks, plan, adaptive
interview, per-turn appraisal, integrity report, assessment, skill diagram, tags,
NL search, manager report, candidate self-report with rebuttal.

Not built, and listed with the reasoning in `/governance`: bias audit tooling
(NYC Local Law 144), retention and deletion policy, real authentication on both
sides, and the EU AI Act Annex III high-risk documentation set. The consent
records, frozen interview plans, and per-turn appraisals are the raw material for
that documentation, but they are not a substitute for it.

This is an engineering artefact, not legal advice. The rules here are moving
quickly and differ by jurisdiction — get counsel in your target markets before
this touches a real candidate.
