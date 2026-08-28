/**
 * Records a demo video of the running app, with Korean subtitles.
 *
 *   npm run demo:record
 *
 * Playwright drives a real Chromium and records the session; ffmpeg cuts it.
 * Nothing is staged — every screen is the actual application. The candidate it
 * tours (JaeWoo Kim) was produced by `npm run demo:live`, which runs a genuine
 * interview through the HTTP API, so the scores and the integrity report on
 * screen came out of the real code paths.
 *
 * The upload segment costs two model calls to reach a real opening question.
 * Everything after it reads existing rows and costs nothing.
 */

import { chromium, type Page } from "playwright";
import { PrismaClient } from "@prisma/client";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("demo");
const PASSCODE = process.env.MANAGER_PASSCODE ?? "letmein";
const RESUME = path.resolve("examples/demo-resume-jaewoo-kim.pdf");

const BEAT = 2200;
const beat = (ms = BEAT) => new Promise((r) => setTimeout(r, ms));

/**
 * Subtitles are injected into the page rather than burned in afterwards, so they
 * stay glued to what is on screen however the timing drifts. Noto Sans KR is
 * pulled in explicitly — the default sans on a Windows Chromium renders Hangul
 * unevenly, and it shows at this size.
 */
async function caption(page: Page, text: string, holdMs = 3200) {
  await page.evaluate((t) => {
    if (!document.getElementById("__demo_font")) {
      const link = document.createElement("link");
      link.id = "__demo_font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@500;700&display=swap";
      document.head.appendChild(link);
    }
    let el = document.getElementById("__demo_caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "__demo_caption";
      el.style.cssText = [
        "position:fixed", "left:50%", "bottom:38px", "transform:translateX(-50%)",
        "background:rgba(8,10,12,.94)", "color:#F4F7F8", "padding:14px 30px",
        "border-radius:10px",
        'font-family:"Noto Sans KR",system-ui,sans-serif',
        "font-weight:500", "font-size:19px", "line-height:1.5",
        "max-width:min(80vw,820px)", "text-align:center", "z-index:2147483647",
        "box-shadow:0 10px 36px rgba(0,0,0,.5)", "border:1px solid rgba(255,255,255,.15)",
        "opacity:0", "transition:opacity .3s ease", "pointer-events:none",
        "word-break:keep-all",
      ].join(";");
      document.body.appendChild(el);
    }
    el.textContent = t;
    requestAnimationFrame(() => { el!.style.opacity = "1"; });
  }, text);
  await beat(holdMs);
}

async function clearCaption(page: Page) {
  await page.evaluate(() => {
    const el = document.getElementById("__demo_caption");
    if (el) el.style.opacity = "0";
  });
  await beat(400);
}

async function glide(page: Page, selector: string) {
  const t = page.locator(selector).first();
  if (await t.count()) { await t.scrollIntoViewIfNeeded(); await beat(600); }
}

/** Poll for the interview the upload just created. */
async function waitForInterview(since: Date, timeoutMs: number): Promise<string | null> {
  const db = new PrismaClient();
  try {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const row = await db.interview.findFirst({
        where: { candidate: { email: "jaewoo.kim@example.com" }, startedAt: { gte: since } },
        orderBy: { startedAt: "desc" },
        select: { id: true },
      });
      if (row) return row.id;
      await new Promise((r) => setTimeout(r, 1500));
    }
    return null;
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  rmSync(path.join(OUT, "raw"), { recursive: true, force: true });
  mkdirSync(path.join(OUT, "raw"), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: path.join(OUT, "raw"), size: { width: 1280, height: 800 } },
    colorScheme: "dark",
  });
  const page = await context.newPage();

  await page.goto(BASE);
  await page.evaluate((p) => sessionStorage.setItem("hs_passcode", p), PASSCODE);

  // ---- what it is ----------------------------------------------------
  await page.goto(BASE, { waitUntil: "networkidle" });
  await beat(600);
  await caption(page, "HireScope는 지원자의 이력서를 먼저 읽고, 거기서 질문을 만듭니다.", 3000);
  await clearCaption(page);
  await glide(page, "text=What this system does not do");
  await caption(page, "카메라도, 시선 추적도, 감정 분석도 하지 않습니다. 의도적인 설계입니다.", 3100);
  await clearCaption(page);

  // ---- the standard lives outside the code ---------------------------
  await page.goto(`${BASE}/apply`, { waitUntil: "networkidle" });
  await beat(600);
  await caption(page, "직무는 코드가 아니라 마크다운 파일로 정의됩니다. 현재 20개 직무.", 3000);
  await clearCaption(page);

  // ---- a real PDF, through the real extraction path -------------------
  await caption(page, "실제 PDF 이력서를 업로드합니다.", 2500);
  await page.setInputFiles('input[type="file"]', RESUME).catch(() => {});
  // Same person the manager half tours, so the two halves are one story rather
  // than two. The upsert only refreshes name and consent; the completed
  // interview and its assessment are untouched.
  await page.fill('input[type="email"]', "jaewoo.kim@example.com").catch(() => {});
  // The role select defaults to whatever sorts first, which is B2B sales — a
  // mismatch against a payments engineer's resume that reads as an accident.
  await page.selectOption("select >> nth=0", { label: "Software developer" }).catch(() => {});
  await beat(800);
  await clearCaption(page);

  await glide(page, "text=Your consent");
  await caption(page, "동의는 목적별로 나뉘어 있고, 지원자가 본 정책 버전과 함께 기록됩니다.", 3100);
  await clearCaption(page);
  for (const box of await page.locator('input[type="checkbox"]').all()) {
    await box.check({ timeout: 2000 }).catch(() => {});
    await beat(260);
  }

  await caption(page, "이력서를 읽고 면접 계획을 세웁니다. 지금 실제로 실행되는 중입니다.", 2700);
  const submittedAt = new Date();
  await page.locator("button", { hasText: /begin|start/i }).first().click({ timeout: 5000 }).catch(() => {});

  // Watch the database rather than the address bar. The client-side redirect is
  // not reliable enough to hang a recording on — in dev, a Fast Refresh remount
  // drops the in-flight request even though the server has already written the
  // interview, and the recording then sits on a dead form until the URL wait
  // times out. The row appearing is the real completion signal.
  const interviewId = await waitForInterview(submittedAt, 200_000);
  await beat(600);
  await clearCaption(page);

  if (interviewId) {
    await page.goto(`${BASE}/interview/${interviewId}`, { waitUntil: "networkidle" });
    await beat(800);
  }
  await caption(page, "이 지원자의 실제 경력에서 나온 첫 질문입니다.", 3200);
  await clearCaption(page);

  // ---- the manager's side --------------------------------------------
  await page.goto(`${BASE}/manager/candidates`, { waitUntil: "networkidle" });
  await beat(600);
  await caption(page, "평가가 끝난 지원자 목록. 점수가 낮다고 숨기지 않습니다.", 3000);
  await clearCaption(page);
  await page.mouse.wheel(0, 500); await beat(1000);

  // ---- one candidate, in full ----------------------------------------
  const card = page.locator('a[href*="/manager/candidate/"]', { hasText: "JaeWoo Kim" }).first();
  if (await card.count()) { await card.click(); }
  else { await page.locator('a[href*="/manager/candidate/"]').first().click(); }
  await page.waitForLoadState("networkidle").catch(() => {});
  await beat(800);
  await caption(page, "직무 기준에서 그대로 생성된 역량 다이어그램.", 3000);
  await clearCaption(page);

  await glide(page, "text=Competency detail");
  await caption(page, "모든 점수에는 근거가 된 발언이 함께 남습니다. 확인되지 않은 항목은 그렇게 표시됩니다.", 3300);
  await clearCaption(page);
  await page.mouse.wheel(0, 650); await beat(1000);

  await glide(page, "text=Tags");
  await caption(page, "면접에서 입증된 것과, 이력서에 적혀 있을 뿐인 것을 구분합니다.", 3100);
  await clearCaption(page);

  // ---- the integrity panel, with real signals in it -------------------
  await glide(page, "text=Session integrity");
  await beat(600);
  await caption(page, "세션 무결성 — 창 전환, 붙여넣기, 답변 타이밍이 실제로 기록된 결과입니다.", 3300);
  await clearCaption(page);
  await page.mouse.wheel(0, 260); await beat(800);
  await caption(page, "얼굴이나 시선은 보지 않습니다. 증거가 아니라, 사람이 확인해 볼 이유입니다.", 3300);
  await clearCaption(page);

  // ---- search ---------------------------------------------------------
  await page.goto(`${BASE}/manager`, { waitUntil: "networkidle" });
  await beat(1000);
  await caption(page, "채용 담당자는 평범한 문장으로 검색합니다.", 2500);
  await clearCaption(page);
  const box = page.locator('input[type="text"], input:not([type])').first();
  await box.click().catch(() => {});
  await box.type("Software engineer who has experience with PyTorch", { delay: 45 }).catch(() => {});
  await beat(800);

  // ---- governance ------------------------------------------------------
  await page.goto(`${BASE}/governance`, { waitUntil: "networkidle" });
  await beat(800);
  await caption(page, "그리고 이 시스템이 하지 않는 일과, 아직 남은 과제를 분명히 적어 둔 페이지.", 3300);
  await clearCaption(page);
  await page.mouse.wheel(0, 700); await beat(800);

  await context.close();
  await browser.close();
  console.log(`Raw recording written to ${path.join(OUT, "raw")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
