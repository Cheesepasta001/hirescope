import { db, readJson } from "@/lib/db";
import { NextResponse } from "next/server";
import type { InterviewPlan } from "@/lib/interview/plan";
import type { IntegrityReport } from "@/lib/integrity/signals";
import { explainOverall, weightFor } from "@/lib/assess/scoring";

export const runtime = "nodejs";

/**
 * The record of one interview and its homework, as a file.
 *
 * This is the "no record survives as evidence" half of the brief. What a hiring
 * record has to answer months later is not "what was the score" but "what was
 * this person asked, what did they say, and what standard were they held to" —
 * so all three are in here, with the criteria file and version named.
 *
 * Markdown rather than a database export: the reader is a person attaching it to
 * a hiring file, not a system.
 *
 * The database remains the source of truth. This is a view of it, generated on
 * request, never the storage.
 *
 * Authorised by the unguessable interview id, matching the candidate's own
 * report route. Adequate for a demo, not for production — see /governance.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const interview = await db.interview.findUnique({
    where: { id },
    include: {
      candidate: true,
      turns: { orderBy: { idx: "asc" } },
      assessment: { include: { scores: true } },
      criteriaSet: { include: { competencies: { orderBy: { orderIndex: "asc" } } } },
      homework: { include: { submission: true } },
    },
  });

  if (!interview) {
    return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  }

  const plan = readJson<InterviewPlan | null>(interview.plan, null);
  const a = interview.assessment;
  const priorityByKey = new Map(
    (interview.criteriaSet?.competencies ?? []).map((c) => [c.key, c.priority]),
  );

  const lines: string[] = [];
  const push = (...parts: string[]) => lines.push(...parts);

  push(
    `# Interview record — ${interview.candidate.name}`,
    "",
    `- **Role:** ${interview.seniority} ${interview.roleTitle}`,
    `- **Candidate:** ${interview.candidate.name} <${interview.candidate.email}>`
      + (interview.candidate.phone ? ` · ${interview.candidate.phone}` : ""),
    `- **Started:** ${interview.startedAt.toISOString()}`,
    `- **Completed:** ${interview.completedAt?.toISOString() ?? "not completed"}`,
    `- **Status:** ${interview.status}`,
    "",
  );

  if (interview.criteriaSet) {
    push(
      `## The standard applied`,
      "",
      `Assessed against \`${interview.criteriaSet.sourcePath}\` version `
        + `${interview.criteriaSet.version}, parsed ${interview.criteriaSet.parsedAt.toISOString()}. `
        + `Later edits to that file do not change this record.`,
      "",
      "| Competency | Key | Priority | Weight |",
      "| --- | --- | --- | --- |",
      ...interview.criteriaSet.competencies.map(
        (c) => `| ${c.label} | \`${c.key}\` | ${c.priority} | ${weightFor(c.priority)} |`,
      ),
      "",
    );
    if (plan?.focusRationale) {
      push(`**Interview focus, fixed before the first question:** ${plan.focusRationale}`, "");
    }
  }

  push(
    `## Consent`,
    "",
    `- AI interview and assessment: ${yn(interview.candidate.consentInterview)}`,
    `- Session integrity monitoring: ${yn(interview.candidate.consentRecording)}`,
    `- Link verification: ${yn(interview.candidate.consentLinkCheck)}`,
    `- Recorded: ${interview.candidate.consentedAt?.toISOString() ?? "—"}`
      + (interview.candidate.consentPolicyVer
        ? ` (policy ${interview.candidate.consentPolicyVer})`
        : ""),
    "",
  );

  push(`## Interview transcript`, "");
  if (interview.turns.length === 0) {
    push("_No turns were recorded._", "");
  } else {
    for (const t of interview.turns) {
      const who = t.role === "interviewer" ? "INTERVIEWER" : "CANDIDATE";
      const tag = t.competency ? ` _(${t.competency})_` : "";
      push(`**${who}**${tag}`, "", t.text, "");
    }
  }

  if (interview.homework) {
    const hw = interview.homework;
    push(
      `## Homework task`,
      "",
      `**${hw.title}** — about ${hw.estimatedMinutes} minutes, set ${hw.createdAt.toISOString()}`,
      "",
      `_Targets: ${readJson<string[]>(hw.targetKeys, []).join(", ") || "none recorded"}_`,
      "",
      hw.brief,
      "",
      `### Submission`,
      "",
    );
    if (hw.submission) {
      push(
        `Submitted ${hw.submission.submittedAt.toISOString()}`
          + (hw.submission.gradedAt ? `, marked ${hw.submission.gradedAt.toISOString()}` : ", not yet marked"),
        "",
        hw.submission.text,
        "",
      );
      if (hw.submission.graderNote) push(`**Marker's note:** ${hw.submission.graderNote}`, "");
    } else {
      push("_Not submitted._", "");
    }
  }

  if (a) {
    const counted = a.competenciesCounted;
    const total = a.competenciesTotal || a.scores.length;
    const weightSum = a.scores
      .filter((s) => s.reached)
      .reduce((sum, s) => sum + weightFor(priorityByKey.get(s.competencyKey) ?? "medium"), 0);

    push(
      `## Assessment`,
      "",
      `**Overall: ${a.overallScore}/100** — ${explainOverall({
        overall: a.overallScore,
        counted,
        total,
        weightSum,
        unreached: a.scores.filter((s) => !s.reached).map((s) => s.competencyKey),
      })}`,
      "",
      `**Recommendation: ${a.recommendation.replace(/_/g, " ")}** — decision support only. `
        + `The hire or reject decision is a human's and is not recorded here.`,
      "",
      a.summary,
      "",
      `### Competency scores`,
      "",
      "| Competency | Source | Score | Confidence | Evidence |",
      "| --- | --- | --- | --- | --- |",
      ...a.scores.map((s) =>
        `| ${s.label} | ${s.source} | ${s.reached ? `${round(s.score)}/10` : "not assessed"} | `
        + `${s.reached ? s.confidence : "—"} | ${escapeCell(s.evidenceQuote)} |`,
      ),
      "",
      `### Strengths`,
      "",
      ...readJson<string[]>(a.strengths, []).map((s) => `- ${s}`),
      "",
      `### Concerns`,
      "",
      ...readJson<string[]>(a.concerns, []).map((s) => `- ${s}`),
      "",
    );

    const integrity = readJson<IntegrityReport | null>(a.integrity, null);
    if (integrity) {
      push(
        `### Session integrity`,
        "",
        `Band: ${integrity.band.replace(/_/g, " ")} (${integrity.anomalyScore}/100). `
          + `Advisory only — integrity signals never entered any score.`,
        "",
        ...(integrity.observations.length
          ? integrity.observations.map((o) => `- ${o.label}: ${o.detail}`)
          : ["- Nothing notable was observed."]),
        "",
        `> ${integrity.caveat}`,
        "",
      );
    }
  } else {
    push(`## Assessment`, "", "_This interview was not assessed._", "");
  }

  push(
    "---",
    "",
    `Generated ${new Date().toISOString()} by HireScope. The database is the source of `
      + `truth; this file is a view of it.`,
  );

  const filename = `interview-${slug(interview.candidate.name)}-${interview.id.slice(-6)}.md`;

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

const yn = (v: boolean) => (v ? "given" : "declined");

const round = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Pipes and newlines would break the markdown table this lands in. */
const escapeCell = (text: string) =>
  text.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim() || "—";

const slug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "candidate";
