import { NextResponse } from "next/server";
import { inviteCodesConfigured } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public, non-secret deployment facts the candidate UI needs to render itself.
 *
 * Only booleans and counts leave this endpoint — never the codes themselves,
 * and never anything that would let a caller distinguish a wrong code from a
 * missing one.
 */
export async function GET() {
  return NextResponse.json({
    inviteRequired: inviteCodesConfigured(),
    dailyCap: Number(process.env.MAX_INTERVIEWS_PER_DAY ?? "0") || null,
  });
}
