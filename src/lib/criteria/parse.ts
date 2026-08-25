/**
 * The criteria-file parser.
 *
 * A criteria file is the assessment standard for one role, and it is edited by
 * whoever owns hiring rather than by a developer. Two consequences shape this
 * module:
 *
 * 1. It never repairs. No default priority, no inferred competency, no
 *    "close enough" key. If the file is wrong the load fails and says where.
 *    A file that silently corrected itself would stop being the standard the
 *    person wrote, which is the whole property we are trying to preserve.
 *
 * 2. Errors carry a line number and a fix. The person reading them is editing
 *    markdown in a text editor, not reading a stack trace. Every error below
 *    names the line and says what to write instead.
 *
 * The format is documented for editors in criteria/README.md. Keep the two in
 * step — that document is the contract, this file is the enforcement.
 */

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SECTOR_IDS = [
  "engineering", "finance", "hr", "sales", "product",
  "healthcare", "legal", "operations", "marketing", "other",
] as const;
export type CriteriaSectorId = (typeof SECTOR_IDS)[number];

export type ParsedCompetency = {
  key: string;
  label: string;
  description: string;
  strongAnswer: string;
  weakAnswer: string;
  priority: Priority;
  orderIndex: number;
  /** Line the heading sits on, so errors can point back at it. */
  line: number;
};

export type ParsedCriteria = {
  roleSlug: string;
  roleTitle: string;
  sector: CriteriaSectorId;
  version: number;
  competencies: ParsedCompetency[];
};

export type CriteriaError = {
  /** 1-indexed. 0 means "the file as a whole". */
  line: number;
  message: string;
  /** What to write instead. Always present — an error without a fix is a complaint. */
  fix: string;
};

export type ParseResult =
  | { ok: true; criteria: ParsedCriteria }
  | { ok: false; errors: CriteriaError[] };

/** Minimum viable standard. One competency is not an assessment. */
const MIN_COMPETENCIES = 2;

/**
 * Above this the interview cannot reach everything in one sitting and the tail
 * gets reported as unreached. Exposed for the UI to warn about rather than
 * rejected here — a company may genuinely want that, and refusing would be us
 * overriding their standard.
 */
export const CROWDED_COMPETENCY_COUNT = 10;

const FRONTMATTER_FIELDS = ["roleSlug", "roleTitle", "sector", "version"] as const;

/** The three prose blocks, by the bold label an editor writes above them. */
const PROSE_BLOCKS = [
  { field: "description", label: "What it means" },
  { field: "strongAnswer", label: "A strong answer" },
  { field: "weakAnswer", label: "A weak answer" },
] as const;

export function parseCriteria(source: string, sourcePath: string): ParseResult {
  const errors: CriteriaError[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  const front = readFrontmatter(lines, errors);
  if (!front) return { ok: false, errors };

  const competencies = readCompetencies(lines, front.endLine, errors);

  // Structural checks that only make sense once every block has been read.
  // Suppressed when a competency already failed: "this file defines 0
  // competencies" is confusing noise underneath the errors that explain why.
  if (competencies.length < MIN_COMPETENCIES && errors.length === 0) {
    errors.push({
      line: 0,
      message:
        `This file defines ${competencies.length} competenc${competencies.length === 1 ? "y" : "ies"}. `
        + `At least ${MIN_COMPETENCIES} are needed.`,
      fix: "Add another competency section. See criteria/_TEMPLATE.md.",
    });
  }

  const seen = new Map<string, number>();
  for (const c of competencies) {
    const first = seen.get(c.key);
    if (first !== undefined) {
      errors.push({
        line: c.line,
        message: `Two competencies both use the key "${c.key}" (the first is on line ${first}).`,
        fix: "Keys are how scores are recorded, so they must be unique. Rename one of them.",
      });
    } else {
      seen.set(c.key, c.line);
    }
  }

  if (errors.length) return { ok: false, errors };

  // Filename and roleSlug have to agree, or criteria/foo.md would define the
  // role "bar" and nobody would find it.
  const basename = sourcePath.split(/[\\/]/).pop()?.replace(/\.md$/i, "") ?? "";
  if (basename && basename !== front.values.roleSlug) {
    return {
      ok: false,
      errors: [{
        line: front.lineOf.roleSlug ?? 0,
        message: `roleSlug is "${front.values.roleSlug}" but the file is named "${basename}.md".`,
        fix: `Either rename the file to "${front.values.roleSlug}.md" or set roleSlug to "${basename}".`,
      }],
    };
  }

  return {
    ok: true,
    criteria: {
      roleSlug: front.values.roleSlug,
      roleTitle: front.values.roleTitle,
      sector: front.values.sector as CriteriaSectorId,
      version: Number(front.values.version),
      competencies,
    },
  };
}

type Frontmatter = {
  values: Record<string, string>;
  lineOf: Record<string, number>;
  /** Index into lines of the closing marker. */
  endLine: number;
};

function readFrontmatter(lines: string[], errors: CriteriaError[]): Frontmatter | null {
  if (lines[0]?.trim() !== "---") {
    errors.push({
      line: 1,
      message: "The file does not start with a frontmatter block.",
      fix: "Line 1 must be exactly three dashes, followed by roleSlug, roleTitle, sector, and version.",
    });
    return null;
  }

  const close = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (close === -1) {
    errors.push({
      line: 1,
      message: "The frontmatter block is never closed.",
      fix: "Add a line containing exactly three dashes after the last frontmatter field.",
    });
    return null;
  }

  const values: Record<string, string> = {};
  const lineOf: Record<string, number> = {};

  for (let i = 1; i < close; i += 1) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const match = raw.match(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!match) {
      errors.push({
        line: i + 1,
        message: `Frontmatter line is not a "field: value" pair: ${raw.trim()}`,
        fix: "Write it as `field: value`, or delete the line.",
      });
      continue;
    }
    // Strip quotes an editor may have added out of habit.
    values[match[1]] = match[2].trim().replace(/^["'](.*)["']$/, "$1").trim();
    lineOf[match[1]] = i + 1;
  }

  for (const field of FRONTMATTER_FIELDS) {
    if (!values[field]) {
      errors.push({
        line: 1,
        message: `Frontmatter is missing "${field}".`,
        fix: `Add a line "${field}: ..." between the two frontmatter markers.`,
      });
    }
  }

  if (values.roleSlug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.roleSlug)) {
    errors.push({
      line: lineOf.roleSlug,
      message: `roleSlug "${values.roleSlug}" is not a valid slug.`,
      fix: "Use lowercase letters, digits, and single hyphens — for example education-planning.",
    });
  }

  if (values.sector && !(SECTOR_IDS as readonly string[]).includes(values.sector)) {
    errors.push({
      line: lineOf.sector,
      message: `sector "${values.sector}" is not one of the known sectors.`,
      fix: `Use one of: ${SECTOR_IDS.join(", ")}.`,
    });
  }

  if (values.version && !/^\d+$/.test(values.version)) {
    errors.push({
      line: lineOf.version,
      message: `version "${values.version}" is not a whole number.`,
      fix: "Use a plain integer, for example: version: 2",
    });
  }

  if (errors.length) return null;
  return { values, lineOf, endLine: close };
}

function readCompetencies(
  lines: string[],
  fromLine: number,
  errors: CriteriaError[],
): ParsedCompetency[] {
  // Fenced code blocks are skipped so a heading inside an example does not read
  // as a competency. Editors do paste examples into these files.
  const headings: number[] = [];
  let inFence = false;
  for (let i = fromLine + 1; i < lines.length; i += 1) {
    if (/^\s*(```|~~~)/.test(lines[i])) inFence = !inFence;
    else if (!inFence && /^##\s+\S/.test(lines[i])) headings.push(i);
  }

  if (headings.length === 0) {
    errors.push({
      line: fromLine + 2,
      message: "No competencies found.",
      fix: "Each competency starts with a level-two heading naming its key. See criteria/_TEMPLATE.md.",
    });
    return [];
  }

  return headings
    .map((start, n) => readOneCompetency(lines, start, headings[n + 1] ?? lines.length, n, errors))
    .filter((c): c is ParsedCompetency => c !== null);
}

function readOneCompetency(
  lines: string[],
  start: number,
  end: number,
  orderIndex: number,
  errors: CriteriaError[],
): ParsedCompetency | null {
  const headingLine = start + 1;
  const key = lines[start].replace(/^##\s+/, "").trim();

  if (!/^[a-z][a-z0-9_]*$/.test(key)) {
    errors.push({
      line: headingLine,
      message: `"${key}" is not a valid competency key.`,
      fix:
        "The heading is the competency's stable id: lowercase letters, digits, and "
        + "underscores only, such as technical_depth. The human-readable name goes on "
        + "the Name line below it.",
    });
    return null;
  }

  const body = lines.slice(start + 1, end);
  const label = readInlineField(body, "Name");
  const priorityRaw = readInlineField(body, "Priority");

  let failed = false;

  if (!label) {
    errors.push({
      line: headingLine,
      message: `Competency "${key}" has no Name.`,
      fix: "Add a bulleted **Name:** line with the display name, directly under the heading.",
    });
    failed = true;
  }

  if (!priorityRaw) {
    errors.push({
      line: headingLine,
      message: `Competency "${key}" has no Priority.`,
      fix: "Add a bulleted **Priority:** line reading high, medium, or low.",
    });
    failed = true;
  } else if (!(PRIORITIES as readonly string[]).includes(priorityRaw.toLowerCase())) {
    errors.push({
      line: headingLine,
      message: `Competency "${key}" has priority "${priorityRaw}", which is not recognised.`,
      fix: "Priority must be exactly high, medium, or low. These map to weights 3, 2, and 1.",
    });
    failed = true;
  }

  const prose: Record<string, string> = {};
  for (const block of PROSE_BLOCKS) {
    const text = readProseBlock(body, block.label);
    if (!text) {
      errors.push({
        line: headingLine,
        message: `Competency "${key}" is missing its "${block.label}" section.`,
        fix: `Add a bold "${block.label}" line inside this competency, then the text below it.`,
      });
      failed = true;
      continue;
    }
    if (text.length < 20) {
      errors.push({
        line: headingLine,
        message: `Competency "${key}" has a "${block.label}" section of only ${text.length} characters.`,
        fix:
          "Write two or three sentences naming concrete behaviours. Both answer halves "
          + "are fed to the scorer, and a one-line weak answer measurably degrades scoring.",
      });
      failed = true;
      continue;
    }
    prose[block.field] = text;
  }

  if (failed) return null;

  return {
    key,
    label: label as string,
    description: prose.description,
    strongAnswer: prose.strongAnswer,
    weakAnswer: prose.weakAnswer,
    priority: (priorityRaw as string).toLowerCase() as Priority,
    orderIndex,
    line: headingLine,
  };
}

/**
 * Reads a bulleted bold-labelled field such as the Name line. Forgiving about
 * the bullet character, the colon landing inside or outside the bold, and the
 * case of the label — all things a person writes without thinking, none of
 * which change the meaning.
 */
function readInlineField(body: string[], label: string): string | null {
  const pattern = new RegExp(
    String.raw`^\s*[-*+]?\s*\*\*\s*` + label + String.raw`\s*:?\s*\*\*\s*:?\s*(.+?)\s*$`,
    "i",
  );
  for (const line of body) {
    const m = line.match(pattern);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

/**
 * Reads the prose under a bold label line, up to the next bold label or bullet
 * field. Markdown emphasis inside the prose is left intact — it reaches the
 * model as written, and an editor who bolded a word meant to.
 */
function readProseBlock(body: string[], label: string): string | null {
  const opener = new RegExp(
    String.raw`^\s*\*\*\s*` + label + String.raw`\s*:?\s*\*\*\s*:?\s*(.*)$`,
    "i",
  );
  const anyLabel = /^\s*[-*+]?\s*\*\*[^*]+\*\*\s*:?\s*$/;
  const inlineField = /^\s*[-*+]\s*\*\*[^*]+\*\*\s*:?/;

  for (let i = 0; i < body.length; i += 1) {
    const m = body[i].match(opener);
    if (!m) continue;

    const collected: string[] = [];
    // A label may be written with its text on the same line.
    if (m[1].trim()) collected.push(m[1].trim());

    for (let j = i + 1; j < body.length; j += 1) {
      const line = body[j];
      if (anyLabel.test(line) || inlineField.test(line)) break;
      collected.push(line);
    }
    const text = collected.join("\n").trim();
    return text || null;
  }
  return null;
}

/** Render errors for a terminal or an HTTP response. One line each, with the fix indented. */
export function formatCriteriaErrors(sourcePath: string, errors: CriteriaError[]): string {
  return [
    `${sourcePath} — ${errors.length} problem${errors.length === 1 ? "" : "s"}:`,
    ...errors.map((e) => {
      const where = e.line > 0 ? `line ${e.line}` : "file";
      return `  ${where}: ${e.message}\n    -> ${e.fix}`;
    }),
  ].join("\n");
}
