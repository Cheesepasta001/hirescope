import { NextResponse } from "next/server";
import { search } from "@/lib/search/query";
import { describeApiError } from "@/lib/claude";
import { usingRealEmbeddings } from "@/lib/embeddings";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Manager search. The passcode gate is demo-grade on purpose — swap it for your
 * real identity provider before this touches production data, because everything
 * behind it is candidate personal data under GDPR Art. 4.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string; passcode?: string };

    const expected = process.env.MANAGER_PASSCODE ?? "letmein";
    if (body.passcode !== expected) {
      return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
    }

    const q = (body.query ?? "").trim();
    if (!q) return NextResponse.json({ error: "Enter a search." }, { status: 400 });
    if (q.length > 1000) return NextResponse.json({ error: "That search is too long." }, { status: 400 });

    const { parsed, hits } = await search(q);

    return NextResponse.json({
      interpretation: parsed.interpretation,
      requiredTags: parsed.requiredTags,
      niceToHaveTags: parsed.niceToHaveTags,
      sector: parsed.sector,
      seniority: parsed.seniority,
      hits,
      semanticQuality: usingRealEmbeddings() ? "voyage" : "local_lexical",
    });
  } catch (error) {
    const { status, message } = describeApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
