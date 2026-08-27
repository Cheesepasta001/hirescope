---
roleSlug: qa-engineer
roleTitle: QA engineer
sector: engineering
version: 1
---

# QA engineer — assessment criteria

Covers quality engineering and test roles, manual and automated. Assesses
reasoning about where defects hide and what is worth automating.

## test_design

- **Name:** Test design
- **Priority:** high

**What it means**

Whether they test where failure is actually likely, or wherever a requirement
happened to be written down. Coverage of requirements is not coverage of risk.

**A strong answer**

Designs from failure modes and boundaries rather than from the happy path. Can
explain which risks a given suite covers and which it deliberately does not.
Uses the requirements as a starting point rather than a boundary.

**A weak answer**

One test per requirement line and nothing else. No boundary, negative, or state
cases. Cannot say what the suite does not cover. Coverage percentage offered as
evidence of quality.

## defect_investigation

- **Name:** Defect investigation
- **Priority:** high

**What it means**

Whether a defect report gives a developer something they can act on immediately,
or starts a second investigation to work out what was meant.

**A strong answer**

Narrows a defect to minimal reproduction steps and states the conditions it
needs. Distinguishes the symptom from the defect. Investigates intermittent
failures rather than re-running until green.

**A weak answer**

Reports symptoms with no reproduction path. Files intermittent failures as flaky
and moves on. Cannot say whether two similar reports are the same defect.
Escalates without having narrowed anything.

## automation_judgement

- **Name:** Automation judgement
- **Priority:** high

**What it means**

Whether they know what is worth automating — the skill that separates a useful
suite from an expensive one.

**A strong answer**

Automates what is stable and repetitive, and argues against automating what is
not. Treats a flaky test as a defect in the suite, to be fixed or removed. Can
name something they chose to keep manual, and why.

**A weak answer**

Automates everything on principle. Tolerates flaky tests and teaches the team to
ignore red. Measures the suite by its size. Cannot name anything not worth
automating.

## quality_advocacy

- **Name:** Quality advocacy
- **Priority:** medium

**What it means**

Whether they can hold a quality line without becoming the department of no.
Influence here depends on being right about which risks are worth the delay.

**A strong answer**

Frames quality risk in terms the team can weigh against delivery. Has argued
successfully to hold a release, and has also agreed to ship with known defects
when that was right. Engages early rather than at the end.

**A weak answer**

Quality asserted as an absolute with no cost acknowledged. Or never pushes back
at all. Involved only at the end of the cycle and treats that as inevitable.

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
