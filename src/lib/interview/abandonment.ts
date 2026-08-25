import { db } from "@/lib/db";

/**
 * Abandonment: what happens when a candidate walks away mid-interview.
 *
 * The rule we were given is "offer one retry; if they decline or do not return,
 * delete that candidate's data". That needs two numbers the rule did not
 * supply, so both are named here rather than buried in a query:
 *
 *   - ABANDON_AFTER_MS — how long a silence means "gone" rather than "thinking".
 *     45 minutes. Long enough to survive a meeting, a lunch, or a laptop lid;
 *     short enough that a candidate returning the same day sees a clean resume
 *     prompt rather than a dead session.
 *
 *   - RETRY_WINDOW_MS — how long the offered retry stays open before the data
 *     goes. 72 hours. Deleting a real applicant's submission is not recoverable,
 *     so the window is generous, and the clock only starts once they have
 *     actually been offered the retry.
 *
 * Deletion is of the *candidate*, cascading through their resume, turns, and
 * integrity events, because a candidate record with no completed interview is
 * exactly the personal data we have no remaining reason to hold. A candidate
 * who has any completed interview is never purged — that assessment is a hiring
 * record, and the rule is about abandoned attempts, not about erasing people.
 */

export const ABANDON_AFTER_MS = 45 * 60 * 1000;
export const RETRY_WINDOW_MS = 72 * 60 * 60 * 1000;

export type StaleState = {
  stale: boolean;
  /** Milliseconds since the last turn. */
  idleMs: number;
  /** When the retry offer expires and the data is eligible for deletion. */
  purgeAfter: Date | null;
};

/** Has this in-progress interview gone quiet long enough to count as abandoned? */
export function assessStaleness(args: {
  status: string;
  startedAt: Date;
  lastTurnAt: Date | null;
  retryOfferedAt: Date | null;
  now?: Date;
}): StaleState {
  const now = args.now ?? new Date();
  if (args.status !== "in_progress") {
    return { stale: false, idleMs: 0, purgeAfter: null };
  }

  const since = args.lastTurnAt ?? args.startedAt;
  const idleMs = now.getTime() - since.getTime();
  const stale = idleMs >= ABANDON_AFTER_MS;

  return {
    stale,
    idleMs,
    purgeAfter: args.retryOfferedAt
      ? new Date(args.retryOfferedAt.getTime() + RETRY_WINDOW_MS)
      : null,
  };
}

/**
 * Record that the candidate has been shown their retry offer. Idempotent — the
 * clock starts at the first offer, so refreshing the page does not extend it.
 */
export async function markRetryOffered(interviewId: string): Promise<Date> {
  const existing = await db.interview.findUnique({
    where: { id: interviewId },
    select: { retryOfferedAt: true },
  });
  if (existing?.retryOfferedAt) return existing.retryOfferedAt;

  const now = new Date();
  await db.interview.update({
    where: { id: interviewId },
    data: { retryOfferedAt: now },
  });
  return now;
}

/**
 * Delete a candidate's data for one abandoned interview.
 *
 * Refuses when the candidate has any completed interview. That is not a special
 * case bolted on — it is the difference between discarding an attempt nobody
 * finished and destroying a hiring record, and the two must never be one code
 * path.
 */
export async function discardAbandoned(
  interviewId: string,
): Promise<{ deleted: "candidate" | "interview" | "nothing"; reason?: string }> {
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    select: {
      id: true,
      status: true,
      candidateId: true,
      candidate: { select: { interviews: { select: { id: true, status: true } } } },
    },
  });

  if (!interview) return { deleted: "nothing", reason: "Interview not found." };
  if (interview.status === "completed") {
    return { deleted: "nothing", reason: "This interview was completed and is a hiring record." };
  }

  const hasCompleted = interview.candidate.interviews.some((i) => i.status === "completed");

  if (hasCompleted) {
    // Drop the abandoned attempt only. Cascades to its turns and signals.
    await db.interview.delete({ where: { id: interview.id } });
    return { deleted: "interview" };
  }

  // Nothing of this person was ever assessed, so nothing about them is worth
  // keeping. Cascades through resumes, findings, interviews, turns, tags.
  await db.candidate.delete({ where: { id: interview.candidateId } });
  return { deleted: "candidate" };
}

/**
 * Everyone whose retry window has closed without them coming back.
 *
 * Exposed as a function rather than run on a timer: this app has no scheduler,
 * and inventing one to satisfy a retention rule would be a worse answer than a
 * script an operator runs. See `npm run purge:abandoned`.
 */
export async function findExpired(now = new Date()): Promise<string[]> {
  const cutoff = new Date(now.getTime() - RETRY_WINDOW_MS);
  const rows = await db.interview.findMany({
    where: {
      status: "in_progress",
      retryOfferedAt: { not: null, lte: cutoff },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
