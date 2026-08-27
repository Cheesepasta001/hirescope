import { NextResponse } from "next/server";
import { describeApiError } from "@/lib/claude";
import {
  requestCrossRoleRead,
  listCrossRoleReads,
  CrossRoleNotPermittedError,
} from "@/lib/assess/crossRoleStore";
import {
  CriteriaValidationError,
  CriteriaNotFoundError,
  listRoles,
} from "@/lib/criteria/load";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Cross-role fit.
 *
 * POST asks the question; the manager initiates, always. The system never
 * volunteers a cross-role read, never suggests a role, and never reassigns
 * anyone — that is the line between feeding a judgement and making it.
 *
 * The passcode travels in the body rather than the query string, matching
 * /api/search and /api/candidates: a passcode in a URL ends up in server logs
 * and browser history.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      passcode?: string;
      roleSlug?: string;
    };

    if (body.passcode !== (process.env.MANAGER_PASSCODE ?? "letmein")) {
      return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
    }
    if (!body.roleSlug) {
      return NextResponse.json({ error: "Pick a role to compare against." }, { status: 400 });
    }

    const read = await requestCrossRoleRead({ candidateId: id, targetRoleSlug: body.roleSlug });
    return NextResponse.json({ read });
  } catch (error) {
    if (error instanceof CrossRoleNotPermittedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CriteriaNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof CriteriaValidationError) {
      return NextResponse.json(
        {
          error:
            "That role's criteria file could not be read, so nothing can be compared "
            + "against it.",
          criteriaFile: error.sourcePath,
          criteriaErrors: error.errors,
        },
        { status: 500 },
      );
    }
    const { status, message, retryable } = describeApiError(error);
    return NextResponse.json({ error: message, retryable }, { status });
  }
}

/**
 * What is already known, plus which roles can be asked about. Never computes a
 * read, so opening a candidate costs nothing.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const passcode = new URL(request.url).searchParams.get("passcode");
  if (passcode !== (process.env.MANAGER_PASSCODE ?? "letmein")) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  const candidate = await db.candidate.findUnique({
    where: { id },
    select: {
      consentCrossRole: true,
      interviews: {
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { roleSlug: true },
      },
    },
  });

  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });

  const interviewedFor = candidate.interviews[0]?.roleSlug ?? null;
  const roles = await listRoles();

  return NextResponse.json({
    consented: candidate.consentCrossRole,
    interviewedFor,
    // Every role except the one they actually interviewed for.
    availableRoles: roles
      .filter((r) => !r.error && r.roleSlug !== interviewedFor)
      .map((r) => ({ roleSlug: r.roleSlug, roleTitle: r.roleTitle })),
    reads: candidate.consentCrossRole ? await listCrossRoleReads(id) : [],
  });
}
