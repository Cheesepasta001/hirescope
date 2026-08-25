---
roleSlug: infrastructure-solution-analyst
roleTitle: Infrastructure solution analyst
sector: engineering
version: 1
---

# Infrastructure solution analyst — assessment criteria

For analysts who turn a business requirement into an infrastructure design —
compute, network, storage, cloud, or hybrid — and who have to defend that design
on cost, availability, and operability. Covers both internal architecture roles
and customer-facing solutioning.

The competency that separates candidates is whether they interrogate the stated
requirement. A designer who builds precisely what was asked for, when what was
asked for was wrong, has done the job badly at speed.

The last four competencies are the general ones shared across every role file.

## requirements_analysis

- **Name:** Requirements analysis
- **Priority:** high

**What it means**

Whether they can get from what someone asked for to what they actually need,
including the constraints nobody mentioned.

**A strong answer**

Asks what the system is for before asking what it should run on. Can describe a
request they pushed back on, and what the real requirement turned out to be.
Surfaces the constraints that decide the design — compliance, data residency,
existing contracts, the team that will operate it — rather than discovering them
late. Separates a firm requirement from a preference.

**A weak answer**

Takes the stated requirement as the specification. Availability targets arrive as
round numbers with no discussion of what they cost or what downtime actually means
to the business. Has never told a requester their request was the wrong shape.

## infrastructure_design

- **Name:** Infrastructure design
- **Priority:** high

**What it means**

Whether their design follows from constraints, and whether they can say where it
stops working.

**A strong answer**

Sizes from measured or estimated load with the assumptions stated, and says what
happens if an assumption is wrong. Reasons about failure domains — what a single
zone, link, or dependency taking the whole thing down would look like — and
matches redundancy to what the business actually needs rather than to the maximum.
Can describe choosing the simpler design and why.

**A weak answer**

Reaches for a reference architecture without connecting it to this problem. Every
component is redundant with no cost discussion, or none is with no risk
discussion. Cannot state the failure domains. Sizing has no derivation.

## operational_realism

- **Name:** Operational realism
- **Priority:** high

**What it means**

Whether they design for the people who will run it at three in the morning, and
for the migration that has to happen before any of it matters.

**A strong answer**

Thinks about monitoring, backup and restore — including whether the restore was
ever tested — patching, and who holds the runbook. Has planned a migration or
cutover with a rollback path, and can describe one that went wrong. Understands
that a design the operating team cannot run is not a good design however elegant.

**A weak answer**

The design ends at the architecture diagram. Backups are mentioned; restores are
not. No migration path, or one that assumes a clean cutover. Operability is
somebody else's concern.

## cost_and_vendor_judgement

- **Name:** Cost and vendor judgement
- **Priority:** medium

**What it means**

Whether they can defend a design on money, and whether they see past a vendor's
framing of the problem.

**A strong answer**

Reasons about total cost over the life of the thing, including licensing, egress,
support, and the staff time to run it. Can describe a cheaper option they chose,
or an expensive one they justified. Understands lock-in as a cost with a number
attached rather than as a slogan. Has challenged a vendor's sizing.

**A weak answer**

Compares on sticker price or on list price only. Accepts vendor sizing and
reference architectures uncritically. Cannot name any ongoing cost beyond the
subscription. Treats lock-in as either irrelevant or disqualifying, with no
analysis either way.

## logical_reasoning

- **Name:** Logical reasoning
- **Priority:** high

**What it means**

How they handle a problem they have not seen before. General across every role we
hire for, and the main thing we compare candidates on.

**A strong answer**

Decomposes an ambiguous problem and states assumptions out loud. Reasons from
constraints rather than pattern-matching to a remembered answer. Notices when
their own conclusion does not follow, and updates cleanly when given a new
constraint rather than defending the first answer.

**A weak answer**

Jumps to a memorised answer. Restates the question instead of advancing on it.
Cannot say what would change their mind. Contradicts an earlier statement without
noticing, or defends a position after its basis has been removed.

## communication

- **Name:** Communication
- **Priority:** high

**What it means**

Whether their thinking survives being explained to someone else. Judged on
structure and calibration, never on fluency, accent, or vocabulary.

**A strong answer**

Structures the answer before diving in. Calibrates depth to what the listener
already knows. Defines jargon when it is load-bearing. Can compress a complicated
thing into two sentences without losing the substance.

**A weak answer**

Rambles without landing anywhere. Hides behind jargon rather than using it.
Answers a nearby question instead of the one asked. Cannot summarise their own
point when asked to.

## ownership

- **Name:** Ownership and judgement
- **Priority:** high

**What it means**

Whether they can distinguish what they did from what happened around them, and
whether they hold themselves to the outcome.

**A strong answer**

Describes decisions they personally made and why. Names tradeoffs they chose
between, including ones they got wrong. Owns a mistake with specifics rather than
in the abstract. Clearly separates their own contribution from the team's without
diminishing either.

**A weak answer**

Every action is attributed to the team and none to themselves. No decision is ever
theirs. Failures are always external — bad requirements, bad management, bad luck.
Cannot name a tradeoff they misjudged.

## collaboration

- **Name:** Collaboration and conflict
- **Priority:** medium

**What it means**

How they behave when a colleague disagrees with them, and whether they can
represent a position they lost.

**A strong answer**

Handles disagreement by engaging with the other position rather than restating
their own. Can describe influencing an outcome without having authority. States a
colleague's view fairly even where they still think it was wrong.

**A weak answer**

Frames every conflict as other people being irrational. Avoids conflict entirely
and calls it pragmatism. Cannot produce a concrete example of either.
