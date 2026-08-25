---
roleSlug: semiconductor-process-engineer
roleTitle: Semiconductor process engineer
sector: engineering
version: 1
---

# Semiconductor process engineer — assessment criteria

For process engineers owning a module in a fab — litho, etch, depo, CMP, diffusion,
implant. Written to be module-agnostic: the competencies are about how someone
reasons about a noisy physical process, not about which tool set they trained on.

Weighted heavily toward evidence discipline, because the failure mode of this role
is confident action on a signal that was noise, and that is expensive in a way
almost nothing else in engineering is.

The last four competencies are the general ones shared across every role file.

## process_control

- **Name:** Statistical process control
- **Priority:** high

**What it means**

Whether they understand what a control chart is actually telling them, as opposed
to treating limits as pass/fail lines handed down from somewhere.

**A strong answer**

Distinguishes control limits from spec limits and can say why confusing the two
causes over-adjustment. Knows what Cp and Cpk each miss. Can describe a time a
chart signalled and the correct response was to investigate rather than to tune,
and a time it was the reverse. Understands that reacting to common-cause variation
makes a process worse, and has watched someone do it.

**A weak answer**

Treats any point near a limit as an excursion. Adjusts the recipe every shift.
Quotes capability indices without knowing what distribution assumption sits under
them. Cannot explain why a process can be in control and still out of spec.

## yield_analysis

- **Name:** Yield and excursion analysis
- **Priority:** high

**What it means**

How they behave when yield drops and the cause is not obvious. This is the
competency the job actually consists of.

**A strong answer**

Describes a real excursion: what the signature looked like on the wafer map, what
that geometry ruled in and out, which lots and tools they used as commonality
groups, and how they discriminated between the surviving hypotheses. Mentions the
split or the SEM cross-section that settled it. Knows the difference between a
correlation across a hundred lots and a cause.

**A weak answer**

The investigation amounts to changing something and watching. Several parameters
moved at once. No mention of what would have falsified the hypothesis. Attributes
the recovery to a fix without evidence the fix is what did it, or cannot describe
an excursion whose cause surprised them.

## experiment_design

- **Name:** Design of experiments
- **Priority:** high

**What it means**

Whether they can get a real answer out of limited wafers, tool time, and patience
from operations.

**A strong answer**

Chooses a design because of what it can resolve, and can say what it is confounded
with. Thinks about run order and blocking against drift and shift-to-shift
variation before running. Knows roughly how many wafers a given effect size needs
and is willing to say an experiment as scoped cannot answer the question. Has
killed their own experiment for that reason.

**A weak answer**

One-factor-at-a-time by default with no account of interactions. Cannot name what
a fractional design gives up. Runs a split with no replication and reports the
difference as real. Treats a p-value as the whole result.

## equipment_and_metrology

- **Name:** Equipment and metrology judgement
- **Priority:** medium

**What it means**

Whether they can tell a process change from a measurement change, and whether they
understand the tool as a physical thing rather than as a recipe interface.

**A strong answer**

Checks gauge capability before believing a shift. Can describe chasing something
that turned out to be metrology drift, or a chamber-matching problem that looked
like a process problem. Understands why their chamber behaves as it does — what
the seasoning does, what the endpoint signal actually measures — rather than only
which knob moves which number.

**A weak answer**

Takes the metrology number as truth. No sense of measurement uncertainty relative
to the effect being chased. Describes the tool purely through its recipe
parameters. Cannot say what would make one chamber differ from its twin.

## safety_and_contamination

- **Name:** Safety and contamination discipline
- **Priority:** high

**What it means**

Fabs run hazardous chemistry at scale, and cross-contamination can cost months.
Whether they treat the rules as load-bearing or as friction.

**A strong answer**

Can explain the reasoning behind a protocol they follow, not just the protocol.
Describes stopping a run, or escalating, on a contamination or safety concern that
turned out to be nothing — and is comfortable that this was still correct. Thinks
about what their change does to the tools downstream of theirs.

**A weak answer**

Describes procedure as bureaucracy that slows engineering down. No example of
escalating. Reasons only about their own module. Has never held a lot on a
suspicion.

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
