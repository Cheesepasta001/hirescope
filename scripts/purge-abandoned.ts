/**
 * Delete abandoned interviews whose retry window has closed.
 *
 *   npm run purge:abandoned          # list what would go, delete nothing
 *   npm run purge:abandoned -- --yes # actually delete
 *
 * Dry by default. This deletes real applicants' submissions and there is no
 * undo, so making someone type --yes is the whole design.
 *
 * Run it from an operator's machine or a host cron. The app deliberately has no
 * scheduler of its own — see the note in src/lib/interview/abandonment.ts.
 */

import { PrismaClient } from "@prisma/client";
import {
  findExpired,
  discardAbandoned,
  ABANDON_AFTER_MS,
  RETRY_WINDOW_MS,
} from "../src/lib/interview/abandonment";

const db = new PrismaClient();
const confirmed = process.argv.includes("--yes");

const hours = (ms: number) => Math.round(ms / 3_600_000);

async function main() {
  console.log(
    `Abandoned after ${Math.round(ABANDON_AFTER_MS / 60_000)} minutes of silence; `
    + `purged ${hours(RETRY_WINDOW_MS)} hours after the retry was offered.\n`,
  );

  const ids = await findExpired();

  if (ids.length === 0) {
    console.log("Nothing to purge.");
    return;
  }

  for (const id of ids) {
    const interview = await db.interview.findUnique({
      where: { id },
      select: {
        retryOfferedAt: true,
        roleTitle: true,
        candidate: { select: { email: true, interviews: { select: { status: true } } } },
      },
    });
    if (!interview) continue;

    const scope = interview.candidate.interviews.some((i) => i.status === "completed")
      ? "this attempt only (the candidate has a completed assessment)"
      : "the whole candidate record";

    if (!confirmed) {
      console.log(
        `would delete ${scope}: ${interview.candidate.email} — ${interview.roleTitle}, `
        + `retry offered ${interview.retryOfferedAt?.toISOString()}`,
      );
      continue;
    }

    const result = await discardAbandoned(id);
    console.log(`deleted ${result.deleted}: ${interview.candidate.email}`);
  }

  console.log(
    confirmed
      ? `\nDone. ${ids.length} abandoned interview${ids.length === 1 ? "" : "s"} processed.`
      : `\n${ids.length} would be deleted. Re-run with --yes to do it.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
