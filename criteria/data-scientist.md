---
roleSlug: data-scientist
roleTitle: Data scientist
sector: engineering
version: 1
---

# Data scientist — assessment criteria

Covers applied data science and analytics roles. Weighted toward reasoning about
evidence rather than model catalogue breadth — knowing many methods matters less
than knowing what each one assumes.

## statistical_reasoning

- **Name:** Statistical reasoning
- **Priority:** high

**What it means**

Whether they know what their methods assume and can tell when those assumptions
have stopped holding. Method breadth matters far less than this.

**A strong answer**

States what a method assumes and checks whether the data meets it. Handles the
difference between correlation and causation as a design problem, not a caveat
sentence. Can describe an analysis where the obvious conclusion was wrong and
how they caught it.

**A weak answer**

Applies methods by familiarity without stating assumptions. Treats statistical
significance as importance. Cannot describe a confounder in their own past work.
Reports a p-value with no account of how many things were tested.

## problem_framing

- **Name:** Framing a question as data work
- **Priority:** high

**What it means**

Whether they can turn a vague business question into something measurable — and
say when the data cannot answer it.

**A strong answer**

Turns an ambiguous request into a specific measurable question and confirms it
is the right one before starting. Says clearly when the available data cannot
support the conclusion being asked for. Estimates whether the answer would
change the decision before doing the work.

**A weak answer**

Starts modelling before the question is defined. Delivers a technically sound
answer to the wrong question. Never tells a stakeholder the data cannot answer
this. Cannot say what decision their analysis was meant to inform.

## validation_discipline

- **Name:** Modelling and validation discipline
- **Priority:** high

**What it means**

Whether their evaluation would survive contact with production. Most models that
look strong offline fail here, and the cause is almost always in how the split
was built.

**A strong answer**

Designs the validation split around how the model will actually be used,
including time ordering where it matters. Compares against a simple baseline
every time. Has found leakage in their own work and can describe how it got
there.

**A weak answer**

Random splits on time-dependent data. No baseline, so the score means nothing.
Tuned against the test set. Reports a strong offline number with no account of
whether it held up afterwards.

## communicating_uncertainty

- **Name:** Communicating uncertainty
- **Priority:** medium

**What it means**

Whether decision-makers end up with a calibrated picture or merely a confident
one. Overstating certainty and hedging everything into uselessness are both
failures.

**A strong answer**

Conveys uncertainty in terms the audience can act on, without either hiding it
or hedging everything into uselessness. States the assumption most likely to be
wrong. Has told a stakeholder the result was too weak to act on.

**A weak answer**

Presents point estimates with no range. Buries caveats in an appendix, or
caveats so heavily that no decision is possible. Has never delivered an
inconclusive result.

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
