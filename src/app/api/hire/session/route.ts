import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Checks the manager passcode, and nothing else.
 *
 * This exists so the Hire side can ask once at the door instead of asking again
 * on every screen. It is not what protects the data: every route that returns
 * candidate information still checks the passcode on its own request, because a
 * gate drawn in the browser is a gate anyone can walk around by editing their
 * own session storage. What this buys is that a wrong passcode is refused
 * without touching the database or returning a single candidate.
 *
 * It is still one shared passcode, not authentication — no accounts, no per-user
 * identity, and everyone holding it is indistinguishable. That limit is listed
 * on /governance and should stay listed there.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { passcode?: string };

  if (body.passcode !== (process.env.MANAGER_PASSCODE ?? "letmein")) {
    return NextResponse.json({ ok: false, error: "That passcode is not right." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
