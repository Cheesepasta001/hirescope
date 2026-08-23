#!/usr/bin/env node
/**
 * Run the demo seed only when the deployment asks for it.
 *
 * Wrapped rather than called directly for two reasons: a seed failure must not
 * fail the build (the app is perfectly usable with an empty corpus, just less
 * impressive), and a deployment holding real candidates must never have invented
 * ones injected alongside them.
 */

import { spawnSync } from "node:child_process";

if (String(process.env.SEED_DEMO_DATA ?? "").toLowerCase() !== "true") {
  console.log("SEED_DEMO_DATA is not \"true\" — skipping demo seed.");
  process.exit(0);
}

console.log("SEED_DEMO_DATA=true — seeding demo candidates…");
const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  // Deliberately exit 0: an unseeded demo is a worse demo, not a broken deploy.
  console.warn("Demo seed did not complete. Continuing — the app runs fine with an empty corpus.");
}
process.exit(0);
