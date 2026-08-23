import { NextResponse } from "next/server";
import { db, writeJson } from "@/lib/db";
import { describeApiError } from "@/lib/claude";
import { extractText, assertReasonableLength } from "@/lib/resume/text";
import { extractResume } from "@/lib/resume/extract";
import { checkConsistency } from "@/lib/verify/consistency";
import { checkLinks } from "@/lib/verify/links";
import { buildPlan } from "@/lib/interview/plan";
import { checkInviteCode, checkDailyCap } from "@/lib/gate";
import type { SectorId } from "@/lib/interview/sectors";

export const runtime = "nodejs";
export const maxDuration = 300;

const POLICY_VERSION = "2026-08-23";

/**
 * Resume upload -> extraction -> verification -> interview plan.
 *
 * This is the slowest request in the app (two model calls plus PDF parsing) and
 * it is done synchronously on purpose: the candidate is sitting there waiting to
 * start, and a job queue would mean building a status-polling flow for a
 * 20-second operation. Move it to a queue when volume justifies it.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();

    // Spend controls run before anything expensive: no PDF parsing, no model
    // calls, no database writes until the caller is allowed to be here.
    const invite = checkInviteCode(String(form.get("inviteCode") ?? ""));
    if (!invite.ok) return NextResponse.json({ error: invite.message }, { status: invite.status });

    const cap = await checkDailyCap();
    if (!cap.ok) return NextResponse.json({ error: cap.message }, { status: cap.status });

    const file = form.get("resume");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No resume file was uploaded." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "That file is over 10MB. Upload the resume only." }, { status: 400 });
    }

    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const roleTitle = String(form.get("roleTitle") ?? "").trim();
    const sector = String(form.get("sector") ?? "other") as SectorId;
    const seniority = String(form.get("seniority") ?? "mid");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (!roleTitle) {
      return NextResponse.json({ error: "Tell us which role you are applying for." }, { status: 400 });
    }

    // Consent is explicit and per-purpose. The interview cannot proceed without
    // the first two; link checking is genuinely optional and defaults to off.
    const consentInterview = form.get("consentInterview") === "true";
    const consentRecording = form.get("consentRecording") === "true";
    const consentLinkCheck = form.get("consentLinkCheck") === "true";

    if (!consentInterview) {
      return NextResponse.json(
        { error: "We cannot run an AI-assessed interview without your consent." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text } = await extractText(buffer, file.type, file.name);
    assertReasonableLength(text);

    const extracted = await extractResume(text);

    const candidate = await db.candidate.upsert({
      where: { email },
      create: {
        email,
        name: extracted.name || email.split("@")[0],
        phone: extracted.phone || null,
        location: extracted.location || null,
        consentInterview,
        consentRecording,
        consentLinkCheck,
        consentedAt: new Date(),
        consentPolicyVer: POLICY_VERSION,
      },
      update: {
        name: extracted.name || undefined,
        consentInterview,
        consentRecording,
        consentLinkCheck,
        consentedAt: new Date(),
        consentPolicyVer: POLICY_VERSION,
      },
    });

    const resume = await db.resume.create({
      data: {
        candidateId: candidate.id,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        rawText: text,
        extracted: writeJson(extracted),
      },
    });

    // Internal consistency runs always; link checks only under their own consent.
    const findings = checkConsistency(extracted);
    const linkResults = await checkLinks(extracted.links, { consentGiven: consentLinkCheck });

    await db.verificationFinding.createMany({
      data: [
        ...findings.map((f) => ({
          resumeId: resume.id,
          kind: f.kind,
          severity: f.severity,
          field: f.field ?? null,
          detail: f.detail,
          evidence: f.evidence ? writeJson(f.evidence) : null,
        })),
        ...linkResults.map((l) => ({
          resumeId: resume.id,
          kind: l.status === "verified" ? "link_ok" : "link_mismatch",
          severity: l.status === "mismatch" ? "medium" : "info",
          field: "links",
          detail: `${l.url} — ${l.detail}`,
          evidence: writeJson(l),
        })),
      ],
    });

    const plan = await buildPlan(extracted, sector, roleTitle, seniority);

    const interview = await db.interview.create({
      data: {
        candidateId: candidate.id,
        resumeId: resume.id,
        sector,
        roleTitle,
        seniority,
        plan: writeJson(plan),
      },
    });

    // The opening question is turn 0, written before the candidate says anything.
    await db.turn.create({
      data: {
        interviewId: interview.id,
        idx: 0,
        role: "interviewer",
        text: plan.openingQuestion,
        competency: plan.targets[0]?.competencyId ?? null,
        questionType: "resume_probe",
        probeDepth: 0,
      },
    });

    return NextResponse.json({
      interviewId: interview.id,
      candidateName: extracted.name,
      headline: extracted.headline,
      questionBudget: plan.questionBudget,
      openingQuestion: plan.openingQuestion,
    });
  } catch (error) {
    const { status, message } = describeApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
