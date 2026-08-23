import { NextResponse } from "next/server";
import { db, writeJson } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "blur", "tab_hidden", "paste", "copy", "fullscreen_exit", "devtools", "second_voice",
]);

/**
 * Integrity telemetry from the browser. Fire-and-forget from the client.
 *
 * Note what is not accepted here: no video frames, no audio, no face or gaze
 * data. The `second_voice` signal carries a boolean and a timestamp — voice
 * *presence* computed client-side by the Web Audio API, never a recording, never
 * a voiceprint, never an emotion label. Nothing that would constitute biometric
 * processing reaches this endpoint.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as { type?: string; payload?: Record<string, unknown> };

    if (!body.type || !ALLOWED.has(body.type)) {
      return NextResponse.json({ error: "Unknown signal type." }, { status: 400 });
    }

    const interview = await db.interview.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!interview || interview.status !== "in_progress") {
      // Silently accept: a late beacon after the interview ended is not an error
      // worth surfacing to a candidate mid-session.
      return NextResponse.json({ ok: true });
    }

    // Only scalar metadata is persisted — notably pasted *length*, never pasted text.
    const payload = body.payload
      ? Object.fromEntries(
          Object.entries(body.payload)
            .filter(([, v]) => typeof v === "number" || typeof v === "boolean")
            .slice(0, 8),
        )
      : null;

    await db.integrityEvent.create({
      data: {
        interviewId: id,
        type: body.type,
        payload: payload ? writeJson(payload) : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
