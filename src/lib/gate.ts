import { db } from "@/lib/db";

/**
 * Access control for the public demo.
 *
 * A shared link with no gate is an unbounded charge on the owner's Anthropic
 * account: a full interview is a dozen Opus 5 calls over a growing transcript,
 * and nothing stops one visitor from starting a hundred of them.
 *
 * Two independent limits, because they fail differently. Invite codes stop
 * strangers; the daily cap stops an invited person (or a bug, or a retry loop)
 * from running up a bill. Neither is security — this is spend control for a demo.
 * Real authentication is still the item in /governance.
 */

export type GateResult = { ok: true } | { ok: false; status: number; message: string };

/** Codes are comma-separated in INVITE_CODES. Unset means the gate is open. */
export function inviteCodesConfigured(): boolean {
  return Boolean(process.env.INVITE_CODES?.trim());
}

function validCodes(): string[] {
  return (process.env.INVITE_CODES ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

export function checkInviteCode(supplied: string | null | undefined): GateResult {
  if (!inviteCodesConfigured()) return { ok: true };

  const code = (supplied ?? "").trim().toLowerCase();
  if (!code) {
    return { ok: false, status: 401, message: "An invite code is required to start an interview." };
  }
  if (!validCodes().includes(code)) {
    return { ok: false, status: 401, message: "That invite code is not valid." };
  }
  return { ok: true };
}

/**
 * Interviews started since midnight UTC. Counting starts rather than completions
 * on purpose: an abandoned interview still spent the extraction and planning
 * calls, so it has to count against the budget.
 */
export async function checkDailyCap(): Promise<GateResult> {
  const max = Number(process.env.MAX_INTERVIEWS_PER_DAY ?? "0");
  if (!Number.isFinite(max) || max <= 0) return { ok: true };

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  const started = await db.interview.count({ where: { startedAt: { gte: since } } });
  if (started >= max) {
    return {
      ok: false,
      status: 429,
      message:
        `This demo is capped at ${max} interviews per day and has reached the limit. `
        + `It resets at midnight UTC.`,
    };
  }
  return { ok: true };
}

/**
 * A hard ceiling on turns per interview, independent of the plan's question
 * budget. The engine is supposed to wind down on its own, but "supposed to" is
 * not a spend control — without this, a client that keeps POSTing answers keeps
 * costing money for as long as it likes.
 */
export const MAX_TURNS_OVER_BUDGET = 3;
