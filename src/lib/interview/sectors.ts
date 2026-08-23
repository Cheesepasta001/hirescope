/**
 * Competency frameworks per job sector.
 *
 * Two layers: every interview covers the universal competencies (they are what
 * managers actually compare across candidates), plus the sector's own technical
 * competencies. The interview plan allocates question budget across both.
 */

export type Competency = {
  id: string;
  label: string;
  /** What a strong answer demonstrates. Fed to both the question generator and the scorer. */
  probes: string;
  /** Concrete markers of a weak answer, so scoring is not purely vibes. */
  weakSignals: string;
};

export const UNIVERSAL_COMPETENCIES: Competency[] = [
  {
    id: "logical_reasoning",
    label: "Logical reasoning",
    probes:
      "Decomposes an ambiguous problem, states assumptions explicitly, reasons from "
      + "constraints rather than pattern-matching, notices when their own conclusion "
      + "does not follow, and updates when given a new constraint.",
    weakSignals:
      "Jumps to a memorised answer, restates the question, cannot say what would "
      + "change their mind, contradicts an earlier statement without noticing.",
  },
  {
    id: "communication",
    label: "Communication",
    probes:
      "Structures an answer before diving in, calibrates depth to the listener, "
      + "defines jargon when it matters, and can compress a complex thing into two "
      + "sentences without losing the substance.",
    weakSignals:
      "Rambles without landing, hides behind jargon, answers a different question "
      + "than the one asked, cannot summarise their own point when asked to.",
  },
  {
    id: "ownership",
    label: "Ownership and judgement",
    probes:
      "Describes decisions they personally made and why, names tradeoffs they chose "
      + "between, owns a mistake with specifics, distinguishes what they did from what "
      + "their team did.",
    weakSignals:
      "Every action is attributed to the team and none to themselves, no decision is "
      + "ever theirs, failures are always external, cannot name a tradeoff they got wrong.",
  },
  {
    id: "collaboration",
    label: "Collaboration and conflict",
    probes:
      "Handles disagreement by engaging with the other position, describes influencing "
      + "without authority, and can articulate a colleague's view fairly even when they "
      + "disagreed with it.",
    weakSignals:
      "Frames every conflict as others being wrong or irrational, avoids conflict "
      + "entirely, cannot produce a concrete example.",
  },
];

export type SectorId =
  | "engineering" | "finance" | "hr" | "sales" | "product"
  | "healthcare" | "legal" | "operations" | "marketing" | "other";

export const SECTORS: Record<SectorId, { label: string; competencies: Competency[] }> = {
  engineering: {
    label: "Engineering",
    competencies: [
      {
        id: "technical_depth",
        label: "Technical depth",
        probes:
          "Can go three levels deeper than the summary on something they built. Knows "
          + "why their stack behaves the way it does, not just how to invoke it. "
          + "Distinguishes what they understand from what they copied.",
        weakSignals:
          "Depth collapses on the second follow-up, describes tools rather than "
          + "problems, cannot explain a failure mode of something they claim to know well.",
      },
      {
        id: "system_design",
        label: "System design",
        probes:
          "Reasons about load, failure, and data flow. Picks a design because of a "
          + "constraint, states what it costs, and knows where it breaks at 10x.",
        weakSignals:
          "Reaches for a named architecture without justifying it, ignores failure "
          + "modes, cannot estimate scale, treats every problem as a distributed-systems problem.",
      },
      {
        id: "debugging",
        label: "Debugging and rigour",
        probes:
          "Describes a real diagnosis: what they observed, what they hypothesised, how "
          + "they discriminated between hypotheses, and what the root cause turned out to be.",
        weakSignals:
          "The debugging story amounts to looking at it and fixing it, with no "
          + "instrumentation, several changes made at once, and no mention of verifying the fix.",
      },
      {
        id: "code_quality",
        label: "Code and craft",
        probes:
          "Has a defensible position on testing, review, and when to take on debt. "
          + "Can name a codebase decision they would reverse.",
        weakSignals:
          "Absolutist rules with no context, no testing philosophy, dismisses "
          + "maintenance concerns entirely.",
      },
    ],
  },
  finance: {
    label: "Banking and finance",
    competencies: [
      {
        id: "quantitative",
        label: "Quantitative reasoning",
        probes:
          "Comfortable with orders of magnitude, sanity-checks numbers, understands "
          + "what a model's assumptions actually do to its output, notices when a result "
          + "is implausible before being told.",
        weakSignals:
          "Cannot do rough arithmetic aloud, treats model output as fact, cannot state "
          + "the sensitivity of a conclusion to its inputs.",
      },
      {
        id: "financial_acumen",
        label: "Financial acumen",
        probes:
          "Fluent across the three statements, understands how a transaction flows "
          + "through them, can value something and defend the method chosen.",
        weakSignals:
          "Memorised definitions without linkage, cannot walk a change through the "
          + "statements, picks a valuation method without justifying it.",
      },
      {
        id: "risk_judgement",
        label: "Risk and control",
        probes:
          "Thinks about downside first, identifies where a process could fail or be "
          + "gamed, understands why controls exist rather than treating them as friction.",
        weakSignals:
          "Only models upside, treats compliance as an obstacle, no concept of "
          + "segregation of duties or four-eyes review.",
      },
      {
        id: "regulatory",
        label: "Regulatory awareness",
        probes:
          "Knows which regimes touch their work and why, and can describe a time "
          + "regulation actually changed a decision they made.",
        weakSignals:
          "Names regulations without understanding their purpose, cannot connect any "
          + "rule to a concrete action.",
      },
    ],
  },
  hr: {
    label: "HR and people",
    competencies: [
      {
        id: "people_judgement",
        label: "People judgement",
        probes:
          "Reads situations accurately, separates behaviour from personality, and can "
          + "describe changing their mind about someone based on evidence.",
        weakSignals:
          "Sorts people into fixed types, relies on gut with no evidence, cannot "
          + "describe a read they got wrong.",
      },
      {
        id: "difficult_conversations",
        label: "Difficult conversations",
        probes:
          "Has actually delivered hard news. Describes the preparation, the moment, and "
          + "what they would do differently. Holds a line while staying humane.",
        weakSignals:
          "Only hypotheticals, avoids the specifics, either purely soft or purely procedural.",
      },
      {
        id: "employment_practice",
        label: "Employment practice",
        probes:
          "Understands the obligations around hiring, performance, and termination in "
          + "their jurisdiction, and why documentation matters.",
        weakSignals:
          "Would act in ways that create legal exposure, no sense of documentation, "
          + "treats policy as optional.",
      },
      {
        id: "org_design",
        label: "Organisational thinking",
        probes:
          "Connects people decisions to business outcomes, thinks about incentives and "
          + "second-order effects of a policy.",
        weakSignals:
          "Policy for its own sake, no measurement, cannot anticipate how a policy "
          + "will be gamed.",
      },
    ],
  },
  sales: {
    label: "Sales",
    competencies: [
      {
        id: "discovery",
        label: "Discovery",
        probes: "Asks before pitching, uncovers the actual buying problem, qualifies out honestly.",
        weakSignals: "Pitches immediately, no qualification, cannot describe a deal they walked away from.",
      },
      {
        id: "pipeline_rigour",
        label: "Pipeline rigour",
        probes: "Knows their real numbers, forecasts honestly, understands their own conversion math.",
        weakSignals: "Vague numbers, optimistic forecasting with no basis, cannot explain a lost deal.",
      },
      {
        id: "objection_handling",
        label: "Objection handling",
        probes: "Engages the objection rather than deflecting; distinguishes real blockers from stalls.",
        weakSignals: "Scripted rebuttals, argues with the customer, cannot tell a stall from a refusal.",
      },
      {
        id: "commercial_judgement",
        label: "Commercial judgement",
        probes: "Understands margin and long-term account value, not just closing.",
        weakSignals: "Discounts reflexively, optimises for the quarter at the account's expense.",
      },
    ],
  },
  product: {
    label: "Product",
    competencies: [
      {
        id: "user_insight",
        label: "User insight",
        probes: "Grounds decisions in specific user evidence and can describe evidence that surprised them.",
        weakSignals: "Assumes user needs, cites no research, confuses stakeholder opinion with user need.",
      },
      {
        id: "prioritisation",
        label: "Prioritisation",
        probes: "Can explain what they killed and why; makes the tradeoff explicit rather than doing everything.",
        weakSignals: "Everything is a priority, frameworks recited without application, never cut anything.",
      },
      {
        id: "execution",
        label: "Execution",
        probes: "Shipped things; knows what slipped and why; describes scope cuts they made under pressure.",
        weakSignals: "Only strategy, no shipped artefact, cannot describe a launch that went badly.",
      },
      {
        id: "metrics",
        label: "Measurement",
        probes: "Defines success before building, knows the difference between a metric moving and a thing working.",
        weakSignals: "Vanity metrics, no baseline, cannot describe a metric that misled them.",
      },
    ],
  },
  healthcare: {
    label: "Healthcare",
    competencies: [
      {
        id: "clinical_reasoning",
        label: "Clinical and domain reasoning",
        probes: "Works through a case systematically, states differentials, knows the limits of their scope.",
        weakSignals: "Anchors on a first impression, no safety-netting, unclear on scope boundaries.",
      },
      {
        id: "patient_safety",
        label: "Safety and escalation",
        probes: "Knows when and how to escalate, treats near-misses as learning, understands protocol purpose.",
        weakSignals: "Reluctant to escalate, hides errors, treats protocol as bureaucracy.",
      },
      {
        id: "compliance_privacy",
        label: "Privacy and compliance",
        probes: "Handles patient data correctly by instinct, understands the reasoning behind the rules.",
        weakSignals: "Casual about data handling, cannot describe a privacy consideration in their own work.",
      },
      {
        id: "care_communication",
        label: "Communication under stress",
        probes: "Explains complex things to frightened people; handles a distressed interaction concretely.",
        weakSignals: "Jargon with patients, no example, dismissive of the emotional dimension.",
      },
    ],
  },
  legal: {
    label: "Legal",
    competencies: [
      {
        id: "legal_analysis",
        label: "Legal analysis",
        probes: "Separates facts from law, identifies the operative question, reasons to a defensible position.",
        weakSignals: "Conclusory, no authority, cannot argue the other side.",
      },
      {
        id: "risk_advice",
        label: "Practical risk advice",
        probes: "Gives a business-usable answer with the risk quantified, rather than endless hedging.",
        weakSignals: "Pure risk aversion, no commercial awareness, never gives an actual recommendation.",
      },
      {
        id: "drafting",
        label: "Drafting precision",
        probes: "Cares about ambiguity, can explain why a clause is worded a particular way.",
        weakSignals: "Copies precedent without understanding, misses ambiguity when pointed at it.",
      },
      {
        id: "ethics",
        label: "Professional ethics",
        probes: "Recognises conflicts and privilege issues early, knows what to do about them.",
        weakSignals: "Misses an obvious conflict, treats ethics rules as negotiable.",
      },
    ],
  },
  operations: {
    label: "Operations",
    competencies: [
      {
        id: "process_design",
        label: "Process design",
        probes: "Finds the actual bottleneck, designs for the failure case, measures before and after.",
        weakSignals: "Optimises a non-bottleneck, no measurement, adds process without removing any.",
      },
      {
        id: "incident_response",
        label: "Incident response",
        probes: "Describes a real incident with timeline, decisions under uncertainty, and follow-through.",
        weakSignals: "No structure, blames people rather than systems, no post-incident change.",
      },
      {
        id: "vendor_cost",
        label: "Cost and vendor judgement",
        probes: "Understands unit economics of the operation, negotiates from data.",
        weakSignals: "Cannot state their own cost drivers, accepts vendor terms uncritically.",
      },
      {
        id: "scaling",
        label: "Scaling",
        probes: "Knows what broke as volume grew and what they changed structurally rather than by adding people.",
        weakSignals: "Solves everything by hiring, no automation instinct.",
      },
    ],
  },
  marketing: {
    label: "Marketing",
    competencies: [
      {
        id: "positioning",
        label: "Positioning",
        probes: "Can state a sharp position and who it excludes; understands the competitive alternative.",
        weakSignals: "Generic messaging, targets everyone, cannot name the alternative they beat.",
      },
      {
        id: "channel_judgement",
        label: "Channel judgement",
        probes: "Knows their channel economics and can describe a channel they shut off.",
        weakSignals: "Spends broadly with no thesis, no acquisition-cost awareness, chases channels by fashion.",
      },
      {
        id: "creative_judgement",
        label: "Creative judgement",
        probes: "Can articulate why one execution beat another beyond personal taste.",
        weakSignals: "Taste with no reasoning, no testing, cannot separate liking from working.",
      },
      {
        id: "measurement",
        label: "Attribution and measurement",
        probes: "Honest about attribution limits, designs tests that can actually fail.",
        weakSignals: "Claims precise attribution, no holdout, only reports wins.",
      },
    ],
  },
  other: {
    label: "General",
    competencies: [
      {
        id: "domain_depth",
        label: "Domain depth",
        probes: "Deep, specific knowledge of their stated field that survives follow-up questioning.",
        weakSignals: "Surface-level answers, depth collapses on follow-up.",
      },
      {
        id: "problem_solving",
        label: "Problem solving",
        probes: "Structures unfamiliar problems and makes progress under uncertainty.",
        weakSignals: "Freezes on novelty, only knows procedures.",
      },
    ],
  },
};

export function competenciesFor(sector: SectorId): Competency[] {
  const s = SECTORS[sector] ?? SECTORS.other;
  return [...s.competencies, ...UNIVERSAL_COMPETENCIES];
}

export function competencyById(sector: SectorId, id: string): Competency | undefined {
  return competenciesFor(sector).find((c) => c.id === id);
}
