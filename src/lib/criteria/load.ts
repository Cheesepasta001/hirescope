import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import {
  parseCriteria,
  formatCriteriaErrors,
  type CriteriaError,
  type ParsedCriteria,
  type Priority,
} from "./parse";

/**
 * Loading criteria files into the database.
 *
 * The file is the source of truth; the database holds a parsed copy so scores
 * are queryable and so a past assessment can still be read against the standard
 * that was actually in force when it ran.
 *
 * Editing a file does not mutate the existing rows. A changed file hashes
 * differently and becomes a *new* CriteriaSet, and interviews stay attached to
 * the one they started under. That is the same property plan.ts already gives
 * the interview plan — a record of the standard, frozen before the candidate
 * answers anything — and it is the property the brief most directly asks for.
 *
 * Files are read from disk at request time rather than bundled, so an operator
 * can edit a criteria file on a running deployment and have the next interview
 * pick it up. That works because the app runs as a persistent Node process from
 * a full checkout (see render.yaml); it would not work on a serverless host that
 * ships only the traced bundle.
 */

export const CRITERIA_DIR = path.join(process.cwd(), "criteria");

/** Files here document the format rather than defining a role. */
const NON_ROLE_FILES = new Set(["README.md", "_TEMPLATE.md"]);

export class CriteriaValidationError extends Error {
  readonly errors: CriteriaError[];
  readonly sourcePath: string;

  constructor(sourcePath: string, errors: CriteriaError[]) {
    super(formatCriteriaErrors(sourcePath, errors));
    this.name = "CriteriaValidationError";
    this.errors = errors;
    this.sourcePath = sourcePath;
  }
}

export class CriteriaNotFoundError extends Error {
  constructor(roleSlug: string, available: string[]) {
    super(
      `No criteria file for role "${roleSlug}". `
      + (available.length
        ? `Available roles: ${available.join(", ")}.`
        : `The criteria directory is empty — add one, starting from criteria/_TEMPLATE.md.`),
    );
    this.name = "CriteriaNotFoundError";
  }
}

/** One competency, as everything downstream of the parser sees it. */
export type CriteriaCompetency = {
  key: string;
  label: string;
  description: string;
  strongAnswer: string;
  weakAnswer: string;
  priority: Priority;
};

/**
 * A criteria set resolved against the database and ready to hand to the planner,
 * the interview engine, and the scorer. Snapshotted into the interview plan, so
 * those three never re-read the file mid-interview.
 */
export type ResolvedCriteria = {
  criteriaSetId: string;
  roleSlug: string;
  roleTitle: string;
  sector: string;
  version: number;
  sourcePath: string;
  sourceHash: string;
  competencies: CriteriaCompetency[];
};

/** Keyed by roleSlug. Avoids a database round-trip when the file has not changed. */
const cache = new Map<string, { hash: string; resolved: ResolvedCriteria }>();

export function hashSource(source: string): string {
  return createHash("sha256").update(source, "utf8").digest("hex").slice(0, 32);
}

/** Role slugs with a criteria file, sorted. Cheap — used to populate the apply form. */
export async function listRoleSlugs(): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(CRITERIA_DIR);
  } catch {
    return [];
  }
  return entries
    .filter((f) => f.toLowerCase().endsWith(".md") && !NON_ROLE_FILES.has(f))
    .map((f) => f.replace(/\.md$/i, ""))
    .sort();
}

/** Read and validate one file. Throws CriteriaValidationError with line-level detail. */
export async function readCriteriaFile(
  roleSlug: string,
): Promise<{ criteria: ParsedCriteria; source: string; sourcePath: string }> {
  const sourcePath = path.join(CRITERIA_DIR, `${roleSlug}.md`);

  let source: string;
  try {
    source = await readFile(sourcePath, "utf8");
  } catch {
    throw new CriteriaNotFoundError(roleSlug, await listRoleSlugs());
  }

  const result = parseCriteria(source, sourcePath);
  if (!result.ok) throw new CriteriaValidationError(sourcePath, result.errors);

  return { criteria: result.criteria, source, sourcePath };
}

/**
 * Resolve a role to a database-backed criteria set, re-parsing if the file has
 * changed since it was last seen.
 */
export async function resolveCriteria(roleSlug: string): Promise<ResolvedCriteria> {
  const { criteria, source, sourcePath } = await readCriteriaFile(roleSlug);
  const sourceHash = hashSource(source);

  const cached = cache.get(roleSlug);
  if (cached && cached.hash === sourceHash) return cached.resolved;

  const existing = await db.criteriaSet.findUnique({
    where: { roleSlug_sourceHash: { roleSlug, sourceHash } },
    include: { competencies: { orderBy: { orderIndex: "asc" } } },
  });

  const row = existing ?? (await db.criteriaSet.create({
    data: {
      roleSlug: criteria.roleSlug,
      roleTitle: criteria.roleTitle,
      sector: criteria.sector,
      version: criteria.version,
      sourcePath: path.relative(process.cwd(), sourcePath).replace(/\\/g, "/"),
      sourceHash,
      competencies: {
        create: criteria.competencies.map((c) => ({
          key: c.key,
          label: c.label,
          description: c.description,
          strongAnswer: c.strongAnswer,
          weakAnswer: c.weakAnswer,
          priority: c.priority,
          orderIndex: c.orderIndex,
        })),
      },
    },
    include: { competencies: { orderBy: { orderIndex: "asc" } } },
  }));

  const resolved: ResolvedCriteria = {
    criteriaSetId: row.id,
    roleSlug: row.roleSlug,
    roleTitle: row.roleTitle,
    sector: row.sector,
    version: row.version,
    sourcePath: row.sourcePath,
    sourceHash: row.sourceHash,
    competencies: row.competencies.map((c) => ({
      key: c.key,
      label: c.label,
      description: c.description,
      strongAnswer: c.strongAnswer,
      weakAnswer: c.weakAnswer,
      priority: c.priority as Priority,
    })),
  };

  cache.set(roleSlug, { hash: sourceHash, resolved });
  return resolved;
}

/**
 * Every role, for the apply form and the manager filters. A file that fails to
 * parse is reported rather than dropped — a role silently vanishing from a
 * dropdown because of a typo is exactly the failure mode the loud-validation
 * rule exists to prevent.
 */
export async function listRoles(): Promise<
  { roleSlug: string; roleTitle: string; sector: string; competencyCount: number; error?: string }[]
> {
  const slugs = await listRoleSlugs();
  return Promise.all(
    slugs.map(async (roleSlug) => {
      try {
        const { criteria } = await readCriteriaFile(roleSlug);
        return {
          roleSlug,
          roleTitle: criteria.roleTitle,
          sector: criteria.sector,
          competencyCount: criteria.competencies.length,
        };
      } catch (error) {
        return {
          roleSlug,
          roleTitle: roleSlug,
          sector: "other",
          competencyCount: 0,
          error: error instanceof Error ? error.message : "Could not read this criteria file.",
        };
      }
    }),
  );
}

/** Drops the in-process cache. Used by the checker script and by tests. */
export function clearCriteriaCache(): void {
  cache.clear();
}
