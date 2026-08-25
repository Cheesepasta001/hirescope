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
  CROWDED_COMPETENCY_COUNT,
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

for (const file of files) {
  const sourcePath = path.join(CRITERIA_DIR, file);
  const result = parseCriteria(readFileSync(sourcePath, "utf8"), sourcePath);

  if (!result.ok) {
    failed += 1;
    console.error(`\nFAIL  ${formatCriteriaErrors(file, result.errors)}`);
    continue;
  }

  const { criteria } = result;
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

process.exit(failed ? 1 : 0);
