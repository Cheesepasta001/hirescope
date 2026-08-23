#!/usr/bin/env node
/**
 * Flip the Prisma datasource between SQLite and Postgres.
 *
 * Prisma will not accept an env var for `provider`, so the value has to be a
 * literal in the schema. That makes it the one thing that cannot differ between
 * a local machine and a deployment through configuration alone — hence this.
 *
 *   node scripts/db-provider.mjs postgres   # what deploys
 *   node scripts/db-provider.mjs sqlite     # zero-setup local, works offline
 *
 * Committed default is postgres, because a deployment failing is worse than a
 * local machine failing: locally you are right there to read the error.
 */

import { readFileSync, writeFileSync } from "node:fs";

const SCHEMA = new URL("../prisma/schema.prisma", import.meta.url);

const target = (process.argv[2] ?? "").toLowerCase();
const provider =
  target === "postgres" || target === "postgresql" ? "postgresql"
  : target === "sqlite" ? "sqlite"
  : null;

if (!provider) {
  console.error("Usage: node scripts/db-provider.mjs <postgres|sqlite>");
  process.exit(1);
}

const schema = readFileSync(SCHEMA, "utf8");
const pattern = /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")([^"]+)(")/s;
const match = schema.match(pattern);

if (!match) {
  console.error("Could not find the datasource provider in prisma/schema.prisma.");
  process.exit(1);
}

if (match[2] === provider) {
  console.log(`Already on ${provider}. Nothing to do.`);
  process.exit(0);
}

writeFileSync(SCHEMA, schema.replace(pattern, `$1${provider}$3`), "utf8");
console.log(`Switched datasource provider: ${match[2]} -> ${provider}`);
console.log(
  provider === "sqlite"
    ? 'Set DATABASE_URL="file:./dev.db" in .env, then run: npm run db:push'
    : "Point DATABASE_URL at your Postgres instance, then run: npm run db:push",
);
