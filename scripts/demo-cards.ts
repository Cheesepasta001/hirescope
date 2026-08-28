/**
 * Renders the demo's title and interstitial cards as PNGs.
 *
 * Done in a browser rather than with ffmpeg's drawtext because the cards should
 * look like they belong to the product — same palette, same type — and because
 * escaping a Windows font path through a filtergraph is its own small misery.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("demo/cards");

type Card = { file: string; kicker: string; title: string; sub?: string };

const CARDS: Card[] = [
  {
    file: "title.png",
    kicker: "HireScope",
    title: "이력서를 먼저 읽는 면접",
    sub: "이력서에서 나온 질문, 근거가 남는 평가, 검색되는 인재 풀",
  },
  {
    file: "wait.png",
    kicker: "빨리 감기",
    title: "실제로는 약 1분이 걸립니다",
    sub: "이력서 분석 · 자기모순 검증 · 면접 계획 수립",
  },
  {
    file: "end.png",
    kicker: "모든 화면은 실제 동작입니다",
    title: "연출하거나 꾸며낸 화면은 없습니다",
    sub: "github.com/jaewoo001/hirescope",
  },
];

const html = (c: Card) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Mono:wght@500&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<style>
  html,body{margin:0;height:100%;}
  body{
    background:#0B0D10;
    color:#E8ECF1;
    font-family:"Noto Sans KR",Archivo,system-ui,sans-serif;
    display:flex;align-items:center;justify-content:center;
    height:800px;width:1280px;
  }
  .card{max-width:60rem;padding:0 5rem;text-align:left;}
  .kicker{
    font-family:"IBM Plex Mono",monospace;
    font-size:.85rem;letter-spacing:.19em;text-transform:uppercase;
    color:#5B9DFF;margin-bottom:1.6rem;
  }
  h1{
    font-size:3.5rem;font-weight:700;letter-spacing:-.03em;line-height:1.06;
    margin:0;text-wrap:balance;
  }
  p{
    margin:1.5rem 0 0;font-size:1.32rem;line-height:1.5;
    color:#97A3B2;font-weight:500;max-width:44rem;
  }
  .rule{width:3.5rem;height:3px;background:#5B9DFF;margin-top:2.4rem;border-radius:2px;}
</style></head><body>
  <div class="card">
    <div class="kicker">${c.kicker}</div>
    <h1>${c.title}</h1>
    ${c.sub ? `<p>${c.sub}</p>` : ""}
    <div class="rule"></div>
  </div>
</body></html>`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  for (const c of CARDS) {
    await page.setContent(html(c), { waitUntil: "networkidle" });
    // Give the webfont a beat to swap in; a card screenshotted mid-fallback
    // looks subtly wrong in a way that is hard to place.
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, c.file) });
    console.log(`  ${c.file}`);
  }

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
