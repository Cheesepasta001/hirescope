/**
 * Produces one genuinely-interviewed candidate for the demo recording.
 *
 *   npm run demo:live
 *
 * Everything goes through the real HTTP API, so the assessment, competency
 * scores, tags and integrity report all come out of the actual code paths
 * rather than being written into the database.
 *
 * The candidate is played by a model reading the question it was actually
 * asked. An earlier version used pre-written answers and scored 33/100 — not
 * because the system misjudged it, but because canned answers stop matching
 * once the interviewer starts following up, and the interviewer correctly
 * marked a candidate who answered a different question. That is the system
 * working; it is just not what you want in a demo.
 *
 * The integrity signals are posted the way the browser posts them during a real
 * session, and one answer is submitted with the timing shape the heuristic
 * looks for. Those are independent of what the answers say.
 *
 * Costs roughly two to three dollars in model calls. The person is invented.
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const RESUME = "examples/demo-resume-jaewoo-kim.pdf";
const TURNS = Number(process.env.DEMO_TURNS ?? 8);

const claude = new Anthropic();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PERSONA = `You are playing a candidate in a job interview. Stay in character and
answer only as this person would.

You are JaeWoo Kim, a senior backend engineer in Seoul with six years in payments.
You own the settlement service at Danal Fintech, reconciling about 400,000 card
transactions a day against six acquirer statements. Before that, Kakao Commerce
(checkout order-state machine, ~2M orders/month) and Naver Pay (ledger tooling).

Things that actually happened to you, and that you can talk about in detail:
- A partial-capture assumption in the matcher produced about 4,100 false exceptions
  in one night. You assumed one authorisation mapped to one settlement; for split
  shipments it does not. You rewrote the matcher to accumulate against the auth.
- A retry storm double-charged 1,100 customers in March 2023. You introduced
  idempotency keyed on a hash of the request body, written in the same transaction
  as the charge.
- A timezone bug at Kakao mis-dated anything settling after 16:00 KST.
- You trained a gradient-boosted fraud model on 18 months of chargeback data,
  shadow-deployed it for six weeks, and then held it back because precision fell
  below the existing rules engine on the cases that mattered.

How you talk: concrete, specific, unhurried. You name real numbers and real
decisions. You own mistakes plainly without performing contrition. When you do not
know something you say so rather than guessing — and there are things you do not
know, particularly deep infrastructure below your own service and anything about
frontend work.

Answer in two to five sentences of plain spoken prose. No bullet points, no
headings, no markdown. Answer the question you were actually asked — if it is a
follow-up, engage with the specific thing it is following up on rather than
restating your earlier answer.`;

/** Play the candidate against the question the interviewer actually asked. */
async function answerAs(question: string, history: { q: string; a: string }[]): Promise<string> {
  const res = await claude.messages.create({
    model: "claude-opus-5",
    max_tokens: 1200,
    system: PERSONA,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    messages: [
      {
        role: "user",
        content:
          (history.length
            ? `So far in this interview:\n\n${history
                .map((h) => `INTERVIEWER: ${h.q}\nYOU: ${h.a}`)
                .join("\n\n")}\n\n`
            : "")
          + `INTERVIEWER: ${question}\n\nAnswer as JaeWoo.`,
      },
    ],
  });

  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text.trim() : "I'm not sure how to answer that.";
}

/** Posted the way the interview page posts them: fire and forget. */
async function signal(interviewId: string, type: string, payload?: Record<string, number>) {
  await fetch(`${BASE}/api/interview/${interviewId}/signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload }),
  }).catch(() => {});
}

async function main() {
  console.log("Uploading the resume (two model calls, ~60s)…");

  const form = new FormData();
  const bytes = new Uint8Array(await readFile(RESUME));
  form.set("resume", new Blob([bytes], { type: "application/pdf" }), "demo-resume-jaewoo-kim.pdf");
  form.set("email", "jaewoo.kim@example.com");
  form.set("roleSlug", "development");
  form.set("seniority", "senior");
  form.set("consentInterview", "true");
  form.set("consentRecording", "true");
  form.set("consentLinkCheck", "true");
  form.set("consentCrossRole", "true");

  const applyRes = await fetch(`${BASE}/api/apply`, { method: "POST", body: form });
  const apply = await applyRes.json();
  if (!applyRes.ok) throw new Error(apply.error ?? "apply failed");

  const id: string = apply.interviewId;
  let question: string = apply.openingQuestion;
  console.log(`  interview ${id}`);

  const history: { q: string; a: string }[] = [];

  for (let i = 0; i < TURNS; i++) {
    // Signals interleaved through the session, as they would arrive live.
    if (i === 1) { await signal(id, "blur"); await signal(id, "tab_hidden"); }
    if (i === 4) { await signal(id, "blur"); await signal(id, "tab_hidden"); }
    if (i === 6) await signal(id, "blur");

    const answer = await answerAs(question, history);

    // One answer carries the shape the timing heuristic looks for: a long
    // silence, then a long answer arriving faster than composing it would allow.
    const suspicious = i === 4;
    const thinkMs = suspicious ? 34_000 : 6_000 + Math.round(Math.random() * 9_000);
    const cps = suspicious ? 16 : 3.4 + Math.random() * 1.6;
    const submitMs = thinkMs + Math.round(answer.length / cps) * 1000;

    if (suspicious) await signal(id, "paste", { length: answer.length });

    console.log(`  turn ${i + 1}/${TURNS} — answered ${answer.length} chars${suspicious ? " (flagged shape)" : ""}`);

    const res = await fetch(`${BASE}/api/interview/${id}/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer, latencyMsFirstKey: thinkMs, latencyMsSubmit: submitMs }),
    });
    const turn = await res.json();
    if (!res.ok) throw new Error(turn.error ?? "turn failed");

    history.push({ q: question, a: answer });
    question = turn.question;
    if (turn.isFinalQuestion) { console.log("  interviewer signalled the final question"); break; }
    await sleep(250);
  }

  console.log("Finishing (assessment, ~60s)…");
  const finRes = await fetch(`${BASE}/api/interview/${id}/finish`, { method: "POST" });
  const fin = await finRes.json();
  if (!finRes.ok) throw new Error(fin.error ?? "finish failed");

  console.log(`\n  score ${fin.overallScore}/100 — ${fin.recommendation}`);
  console.log(`  ${fin.competenciesCounted}/${fin.competenciesTotal} competencies assessed`);
  console.log(`  candidate ${fin.candidateId}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
