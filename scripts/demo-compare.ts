/**
 * Builds the side-by-side comparison image.
 *
 *   npm run demo:compare
 *
 * Both sides get the same input: this candidate's resume and the full interview
 * transcript. The left is what a general-purpose model returns when you paste
 * that in and ask it to evaluate the candidate — which is what someone without
 * a system actually does. The right is what HireScope produced from the same
 * material.
 *
 * The left side is generated live rather than written by hand, because a
 * comparison you wrote both halves of proves nothing.
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const DATA = JSON.parse(readFileSync("demo/jaewoo.json", "utf8"));
const CACHE = "demo/baseline.txt";
const claude = new Anthropic();

/** The prompt a person types when they have no system: paste it in, ask. */
async function baseline(): Promise<string> {
  if (existsSync(CACHE)) return readFileSync(CACHE, "utf8");

  const transcript = DATA.transcript
    .map((t: { role: string; text: string }) =>
      `${t.role === "interviewer" ? "INTERVIEWER" : "CANDIDATE"}: ${t.text}`)
    .join("\n\n");

  const res = await claude.messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    output_config: { effort: "low" },
    messages: [
      {
        role: "user",
        content:
          `Here is a candidate's resume and the transcript of their interview. `
          + `Evaluate this candidate for a senior backend engineer role.\n\n`
          + `RESUME:\n${DATA.resumeText}\n\nINTERVIEW:\n${transcript}`,
      },
    ],
  });

  const block = res.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text.trim() : "";
  writeFileSync(CACHE, text);
  return text;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function page(left: string): string {
  const reached = DATA.scores.filter((s: any) => s.reached);
  const unreached = DATA.scores.filter((s: any) => !s.reached);

  const scoreRows = reached
    .sort((a: any, b: any) => b.score - a.score)
    .map(
      (s: any) => `
      <div class="srow">
        <span class="slabel">${esc(s.label)}</span>
        <span class="sbar"><i style="width:${s.score * 10}%"></i></span>
        <span class="snum">${s.score}</span>
      </div>
      <div class="squote">“${esc(String(s.evidence).replace(/^[""'\s]+|["'\s]+$/g, "").slice(0, 96))}…”</div>`,
    )
    .join("");

  const unreachedRow = unreached
    .map(
      (s: any) => `
      <div class="srow un">
        <span class="slabel">${esc(s.label)}</span>
        <span class="sbar"><i style="width:0"></i></span>
        <span class="snum">미도달</span>
      </div>
      <div class="squote">면접에서 다루지 않음 — 0점이 아니라 평균에서 제외</div>`,
    )
    .join("");

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>
  *{box-sizing:border-box;margin:0;}
  body{
    width:1680px;background:#0E1114;color:#E9EDEF;
    font-family:"Noto Sans KR",system-ui,sans-serif;
    padding:44px 46px 40px;
  }
  .head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:26px;}
  h1{font-size:30px;font-weight:700;letter-spacing:-.6px;}
  .head p{color:#8FA0A6;font-size:15px;margin-top:8px;max-width:920px;line-height:1.55;}
  .same{
    font-family:"IBM Plex Mono",monospace;font-size:12px;color:#5FBBCB;
    border:1px solid #2A4A50;background:#12262A;border-radius:6px;padding:9px 14px;white-space:nowrap;
  }
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:22px;}
  .col{background:#161B1F;border:1px solid #262E33;border-radius:12px;overflow:hidden;}
  .col.win{border-color:#2F6B60;}
  .ch{padding:15px 20px;border-bottom:1px solid #262E33;display:flex;align-items:center;gap:11px;}
  .col.win .ch{background:#13241F;}
  .tag{
    font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.7px;
    padding:4px 9px;border-radius:4px;background:#2A3238;color:#9FB0B6;
  }
  .col.win .tag{background:#1D4A3E;color:#78D7B4;}
  .ch b{font-size:16px;font-weight:700;}
  .ch span.sub{font-size:12.5px;color:#7C8C92;margin-left:auto;}
  .body{padding:17px 20px;height:560px;overflow:hidden;position:relative;}
  .col:not(.win) .body::after{content:"";position:absolute;left:0;right:0;bottom:0;height:96px;background:linear-gradient(180deg,rgba(22,27,31,0) 0%,#161B1F 78%);}
  .more{position:absolute;left:20px;bottom:14px;font-family:"IBM Plex Mono",monospace;font-size:11px;color:#6C7B80;z-index:2;}
  pre{
    font-family:"Noto Sans KR",sans-serif;font-size:12.4px;line-height:1.6;
    color:#B9C6CB;white-space:pre-wrap;word-break:break-word;
  }
  .big{display:flex;align-items:baseline;gap:12px;margin-bottom:5px;}
  .big b{font-size:44px;font-weight:700;letter-spacing:-1.5px;}
  .big .of{font-family:"IBM Plex Mono",monospace;font-size:12px;color:#7C8C92;}
  .big .rec{margin-left:auto;font-size:13px;color:#78D7B4;font-weight:700;}
  .meta{font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:#7C8C92;margin-bottom:14px;}
  .srow{display:grid;grid-template-columns:132px 1fr 58px;align-items:center;gap:10px;margin-top:9px;}
  .slabel{font-size:12.5px;color:#D4DEE1;}
  .sbar{height:7px;background:#212A2E;border-radius:4px;overflow:hidden;}
  .sbar i{display:block;height:100%;background:#4FB8A0;border-radius:4px;}
  .snum{font-family:"IBM Plex Mono",monospace;font-size:12px;text-align:right;color:#9FB0B6;}
  .srow.un .snum{color:#D9A94F;font-size:10.5px;}
  .srow.un .slabel{color:#8A979B;}
  .squote{font-size:11px;color:#77878C;margin:3px 0 0 142px;padding-right:58px;font-style:italic;line-height:1.45;}
  .diffs{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px;}
  .d{background:#141A1E;border:1px solid #242C31;border-left:3px solid #4FB8A0;border-radius:8px;padding:13px 15px;}
  .d h3{font-size:13.5px;font-weight:700;margin-bottom:7px;}
  .d p{font-size:12px;color:#8FA0A6;line-height:1.55;}
  .d .x{color:#C98A82;} .d .o{color:#78D7B4;}
  footer{margin-top:20px;font-size:11.5px;color:#5F6E73;line-height:1.5;}
</style></head><body>

<div class="head">
  <div>
    <h1>같은 입력, 다른 출력</h1>
    <p>동일한 이력서와 동일한 면접 전문(轉文)을 양쪽에 그대로 넣었습니다.
       차이는 모델의 성능이 아니라, 출력에 무엇이 강제되어 있는가입니다.</p>
  </div>
  <div class="same">INPUT · 이력서 1장 + 면접 전문 ${DATA.transcript.length}턴 (동일)</div>
</div>

<div class="cols">
  <div class="col">
    <div class="ch"><span class="tag">A</span><b>범용 LLM</b>
      <span class="sub">붙여넣고 “이 지원자를 평가해줘”</span></div>
    <div class="body"><pre>${esc(left.slice(0, 1750))}</pre><span class="more">… 이하 생략 (총 ${left.length}자)</span></div>
  </div>

  <div class="col win">
    <div class="ch"><span class="tag">B</span><b>팀 시스템 (HireScope)</b>
      <span class="sub">criteria/development.md v1 기준</span></div>
    <div class="body">
      <div class="big"><b>${DATA.overall}</b><span class="of">/ 100</span>
        <span class="rec">${esc(DATA.rec).replace(/_/g, " ")}</span></div>
      <div class="meta">${DATA.counted}/${DATA.total} 역량 평가됨 · 가중평균 (high 3 / medium 2 / low 1)</div>
      ${scoreRows}${unreachedRow}
    </div>
  </div>
</div>

<div class="diffs">
  <div class="d"><h3>근거</h3><p><span class="x">A —</span> 주장만 있고 인용이 없음<br>
    <span class="o">B —</span> 모든 점수에 지원자의 발언이 붙음</p></div>
  <div class="d"><h3>기준</h3><p><span class="x">A —</span> 매번 즉석에서 정해짐<br>
    <span class="o">B —</span> HR이 쓴 파일, 버전 고정</p></div>
  <div class="d"><h3>모르는 것</h3><p><span class="x">A —</span> 전 항목을 아는 것처럼 씀<br>
    <span class="o">B —</span> 미도달 1개를 미도달로 표시</p></div>
  <div class="d"><h3>재현성</h3><p><span class="x">A —</span> 숫자를 손으로 검산할 수 없음<br>
    <span class="o">B —</span> 가중평균이라 검산 가능</p></div>
</div>

<footer>
  A는 이 이미지를 만들 때 실제로 호출해 받은 출력이며, 손으로 쓰지 않았습니다.
  B는 데이터베이스에 저장된 실제 평가 결과입니다. 지원자는 가상의 인물입니다.
</footer>
</body></html>`;
}

async function main() {
  console.log("Generating the general-LLM baseline…");
  const left = await baseline();
  console.log(`  ${left.length} chars`);

  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
  await p.setContent(page(left), { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  const out = path.resolve("demo/comparison.png");
  await p.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log(`  wrote ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
