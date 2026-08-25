import { NextResponse } from "next/server";
import { listRoles } from "@/lib/criteria/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The roles a candidate can apply for — one per criteria file.
 *
 * Never cached: an operator who edits a criteria file expects the next page load
 * to reflect it. A role whose file will not parse is returned *with* its error
 * rather than dropped, so a typo shows up as a broken role instead of a role
 * that silently disappeared from the dropdown.
 */
export async function GET() {
  const roles = await listRoles();

  return NextResponse.json({
    roles: roles.map((r) => ({
      roleSlug: r.roleSlug,
      roleTitle: r.roleTitle,
      sector: r.sector,
      competencyCount: r.competencyCount,
      available: !r.error,
      error: r.error ?? null,
    })),
  });
}
