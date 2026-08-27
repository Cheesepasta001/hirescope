/**
 * Validate every criteria file, without a database or an API key.
 *
 * This is the feedback loop for whoever edits `criteria/*.md`. It reads the
 * files and nothing else, so it stays runnable when the app itself is not
 * configured.
 *
 *   npm run criteria:check
 *   npm run criteria:check development     # one file
 *
 * It imports the real parser rather than re-implementing the format, so this
 * check and the one the app performs at interview time cannot disagree.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  parseCriteria,
  formatCriteriaErrors,
  isGeneralCompetency,
  CROWDED_COMPETENCY_COUNT,
  type ParsedCompetency,
} from "../src/lib/criteria/parse";

const CRITERIA_DIR = path.join(process.cwd(), "criteria");
const NON_ROLE_FILES = new Set(["README.md", "_TEMPLATE.md"]);

const only = process.argv[2];

let files: string[];
try {
  files = readdirSync(CRITERIA_DIR)
    .filter((f) => f.toLowerCase().endsWith(".md") && !NON_ROLE_FILES.has(f))
    .sort();
} catch {
  console.error(`No criteria directory at ${CRITERIA_DIR}.`);
  process.exit(1);
}

if (only) files = files.filter((f) => f === `${only}.md` || f === only);

if (files.length === 0) {
  console.error(
    only
      ? `No criteria file matching "${only}".`
      : "No criteria files found. Start from criteria/_TEMPLATE.md.",
  );
  process.exit(1);
}

let failed = 0;

/** key -> definitionHash -> files. Drives the transfer report at the end. */
const seen = new Map<string, Map<string, { files: string[]; competency: ParsedCompetency }>>();

for (const file of files) {
  const sourcePath = path.join(CRITERIA_DIR, file);
  const result = parseCriteria(readFileSync(sourcePath, "utf8"), sourcePath);

  if (!result.ok) {
    failed += 1;
    console.error(`\nFAIL  ${formatCriteriaErrors(file, result.errors)}`);
    continue;
  }

  const { criteria } = result;

  for (const c of criteria.competencies) {
    const byHash = seen.get(c.key) ?? new Map();
    seen.set(c.key, byHash);
    const entry = byHash.get(c.definitionHash) ?? { files: [], competency: c };
    entry.files.push(file);
    byHash.set(c.definitionHash, entry);
  }
  console.log(
    `\nOK    ${file} — ${criteria.roleTitle} (${criteria.roleSlug}, `
    + `sector ${criteria.sector}, version ${criteria.version})`,
  );
  for (const c of criteria.competencies) {
    console.log(`        ${c.priority.padEnd(6)} ${c.key.padEnd(24)} ${c.label}`);
  }

  if (criteria.competencies.length > CROWDED_COMPETENCY_COUNT) {
    console.log(
      `        note: ${criteria.competencies.length} competencies is more than one `
      + `interview can reach. The tail will be reported as unreached rather than scored.`,
    );
  }
}

console.log(
  failed
    ? `\n${failed} of ${files.length} file${files.length === 1 ? "" : "s"} could not be read.`
    : `\nAll ${files.length} criteria file${files.length === 1 ? "" : "s"} are valid.`,
);

/**
 * The cross-role transfer report.
 *
 * A cross-role read copies a score between two roles only when a competency key
 * AND its definition text match exactly. This section is how a person checks
 * that the set of things which will transfer is the set they expected, rather
 * than taking the code's word for it.
 *
 * The interesting output is the third block: keys that two files share while
 * meaning different things by them. Those must NOT transfer, and if one appears
 * that you thought was identical, the wording drifted somewhere.
 */
if (!failed && seen.size > 0) {
  const total = [...seen.values()].reduce(
    (sum, byHash) => sum + [...byHash.values()].reduce((n, e) => n + e.files.length, 0),
    0,
  );

  console.log(
    `\n\nCROSS-ROLE TRANSFER REPORT`
    + `\n${total} competencies across ${files.length} files, ${seen.size} distinct keys.\n`,
  );

  const transferable = [...seen.entries()]
    .flatMap(([key, byHash]) =>
      [...byHash.entries()]
        .filter(([, e]) => e.files.length > 1)
        .map(([hash, e]) => ({ key, hash, ...e })),
    )
    .sort((a, b) => b.files.length - a.files.length || a.key.localeCompare(b.key));

  console.log(`  Transfers between roles (same key, same definition):`);
  if (transferable.length === 0) {
    console.log(`    none — every cross-role read will re-score everything`);
  }
  for (const t of transferable) {
    console.log(
      `    ${t.key.padEnd(26)} ${String(t.files.length).padStart(2)} files  `
      + `${isGeneralCompetency(t.key) ? "general" : "ROLE-SPECIFIC"}  ${t.hash}`,
    );
  }

  const divergent = [...seen.entries()].filter(([, byHash]) => byHash.size > 1);
  console.log(`\n  Shared keys with differing definitions (will NOT transfer):`);
  if (divergent.length === 0) {
    console.log(`    none`);
  }
  for (const [key, byHash] of divergent) {
    console.log(`    ${key}`);
    for (const [hash, e] of byHash) {
      console.log(`      ${hash}  ${e.files.join(", ")}`);
    }
  }

  const generalNotShared = [...seen.entries()].filter(
    ([key, byHash]) =>
      isGeneralCompetency(key)
      && [...byHash.values()].some((e) => e.files.length === 1),
  );
  if (generalNotShared.length) {
    console.log(
      `\n  Note: ${generalNotShared.length} general competenc`
      + `${generalNotShared.length === 1 ? "y has" : "ies have"} a file-specific wording. `
      + `That is allowed and often deliberate — it just means the score is re-derived `
      + `rather than carried across for those pairs.`,
    );
  }
}

process.exit(failed ? 1 : 0);
