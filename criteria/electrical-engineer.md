---
roleSlug: electrical-engineer
roleTitle: Electrical engineer
sector: engineering
version: 1
---

# Electrical engineer — assessment criteria

For hardware electrical engineers doing board-level design — analogue, digital,
power, or mixed. Written to probe reasoning about real circuits rather than
familiarity with a particular toolchain or part family.

The competency that most separates candidates is debugging. Design skill can be
taught from a book; the ability to corner a fault in a system that only
misbehaves sometimes cannot.

The last four competencies are the general ones shared across every role file.

## circuit_design

- **Name:** Circuit design
- **Priority:** high

**What it means**

Whether they choose a topology and its component values for stated reasons, and
know where the design stops working.

**A strong answer**

Explains why this topology rather than the obvious alternative, in terms of the
constraint that decided it — efficiency, noise, cost, part availability, thermal.
Knows their margins across temperature, tolerance, and supply variation rather
than at nominal only. Can name the part of the circuit they are least confident
about. Reads the datasheet section that matters, not just the typical-application
diagram.

**A weak answer**

Reproduced the reference design and cannot say what any value does. Designs at
nominal with no worst-case analysis. Cannot state an operating limit. Chooses
parts by familiarity and cannot compare against an alternative on any parameter.

## debug_and_instrumentation

- **Name:** Debugging and instrumentation
- **Priority:** high

**What it means**

What they do with a board that does not work, especially one that works most of
the time.

**A strong answer**

Describes a real fault: what they observed, what they hypothesised, and the
specific measurement that discriminated between the possibilities. Knows how their
own instrument lies to them — probe loading, ground-lead inductance, bandwidth,
aliasing — and has been caught by it once. Bisects rather than changing several
things at once, and confirms the fix actually explains the original symptom.

**A weak answer**

Debugging amounts to swapping components until it works. No account of what was
measured. Several changes at once. Trusts the scope trace without thinking about
how it was taken. Cannot describe a fault whose cause surprised them.

## signal_and_power_integrity

- **Name:** Signal, power, and thermal integrity
- **Priority:** high

**What it means**

Whether they think about the board as a physical object with return paths, loops,
and heat, rather than as a schematic that happens to have been laid out.

**A strong answer**

Reasons about where the return current actually flows and what a split in the
plane beneath a trace does. Places decoupling for a reason they can state. Has a
power budget and a thermal path they can describe end to end. Can name a layout
decision that fixed, or caused, a problem — and understands why the schematic
looked fine throughout.

**A weak answer**

Treats layout as a downstream task. Decoupling is a capacitor per pin because that
is the convention. No power or thermal budget. Cannot explain why a circuit that
simulates correctly might fail on the bench.

## standards_and_compliance

- **Name:** Standards and design for compliance
- **Priority:** medium

**What it means**

Whether they design with certification in mind, or discover it at the end.

**A strong answer**

Knows which standards apply to their products and, more importantly, what those
standards are protecting against. Can describe a design decision made early
specifically to survive EMC or safety testing. Has been to a test house and can
describe a failure and what fixed it. Understands creepage, isolation, or emissions
limits as physics rather than as numbers in a table.

**A weak answer**

Compliance is something the test lab deals with. Cannot name a standard relevant
to their own work. No design decision was ever influenced by it. Treats a test
failure as a paperwork problem.

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
