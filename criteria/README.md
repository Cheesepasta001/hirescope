# Criteria files

**This directory is the assessment standard.** Every question the interview asks
and every score it produces comes from one of these files. They are meant to be
edited by the people who own hiring — not by developers, and not by the model.

One file per role. The filename is the role's identifier:
`criteria/development.md` defines the role `development`.

---

## The rule that matters

**Nothing here is generated.** The system reads these files; it never writes
them, extends them, or fills in a competency it thinks you forgot. If a file is
malformed the load fails loudly and tells you which line is wrong. That is
deliberate: a criteria file that quietly repaired itself would no longer be the
standard you wrote.

The same applies to the four general competencies — reasoning, communication,
ownership, collaboration. Earlier versions of this system injected those into
every interview from code. They are now written out in each file like any other
competency, so you can reweight or remove them. Nothing is added behind your back.

---

## The template

Copy `_TEMPLATE.md` and fill it in. The structure is fixed; the prose is yours.

```markdown
---
roleSlug: development
roleTitle: Software developer
sector: engineering
version: 1
---

# Software developer — assessment criteria

Any prose between the title and the first competency is ignored by the parser.
Use it for notes to whoever edits this next.

## technical_depth

- **Name:** Technical depth
- **Priority:** high

**What it means**

Can go several levels deeper than the summary on something they built...

**A strong answer**

Explains why their stack behaves the way it does, not just how to invoke it...

**A weak answer**

Depth collapses on the second follow-up. Describes tools rather than problems...
```

### Frontmatter

| Field | Required | What it is |
|---|---|---|
| `roleSlug` | yes | Lowercase, digits, hyphens. **Must match the filename.** |
| `roleTitle` | yes | How the role is shown to candidates and managers. |
| `sector` | yes | One of: `engineering`, `finance`, `hr`, `sales`, `product`, `healthcare`, `legal`, `operations`, `marketing`, `other`. Used only for search filtering. |
| `version` | yes | A whole number. Bump it when you make a change worth tracking. |

### Competencies

Each competency is one `##` heading. **The heading text is the competency's
stable key** — it is what scores are recorded against, so changing it renames
the competency and detaches it from past assessments. Rename the `Name:` freely;
change the key rarely.

Keys are lowercase letters, digits, and underscores. Two competencies cannot
share one.

Every competency needs all five parts:

| Part | Written as | Notes |
|---|---|---|
| key | the `##` heading | `## technical_depth` |
| name | `- **Name:** …` | The display label. |
| priority | `- **Priority:** …` | `high`, `medium`, or `low`. See weighting below. |
| description | `**What it means**` + prose | What the competency covers. |
| strong answer | `**A strong answer**` + prose | What good looks like. |
| weak answer | `**A weak answer**` + prose | What weak looks like. |

**Both answer halves are load-bearing.** They are fed to the question generator
*and* to the scorer. A file with rich strong-answer text and a one-line weak
answer produces noticeably worse scoring, because the model has nothing concrete
to score against on the downside.

Aim for two to three sentences each, naming behaviours rather than adjectives.
"Cannot state what would change their mind" is usable. "Lacks critical thinking"
is not.

A file needs at least two competencies. Above roughly ten, the interview cannot
reach them all in one sitting and the extras get reported as unreached.

---

## Priority and weighting

Priority sets how much a competency counts toward the overall score:

| Priority | Weight |
|---|---|
| `high` | 3 |
| `medium` | 2 |
| `low` | 1 |

The overall score is the weighted mean of the competency scores, rescaled to
0–100. Competencies the interview never reached are excluded from the average
rather than scored zero, and the report says how many the score actually rests
on. The arithmetic lives in one place — `src/lib/assess/scoring.ts` — so this
table and the code cannot drift apart.

---

## Editing a live file

The file always wins. The database keeps a parsed copy so scores are queryable,
and re-reads whenever the file's contents change.

Editing a file does **not** rewrite past assessments. A change creates a new
version, and every interview stays attached to the version that was in force when
it started. That is the point: months later you can still answer "what standard
was this person actually held to", which is the question a hiring record has to
survive.

---

## Checking your work

```bash
npm run criteria:check
```

Parses every file in this directory and prints, per file, either the competency
list it found or the exact line of the first problem. Run it after editing —
it costs nothing and needs no API key or database.
