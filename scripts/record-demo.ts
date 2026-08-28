/**
 * Records a demo video of the running app.
 *
 *   npm run demo:record
 *
 * Playwright drives a real Chromium and records the session to webm; ffmpeg
 * turns that into an mp4 with title cards. Nothing here is staged — every screen
 * is the actual application against the seeded database.
 *
 * The candidate half costs two model calls (extraction and planning) to reach a
 * genuine first question. The manager half costs nothing: it reads seeded rows.
 * A full twelve-turn interview is deliberately not recorded — at fifteen seconds
 * a turn it would be five minutes of a progress bar.
 */

import { chromium, type Page } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("demo");
const PASSCODE = process.env.MANAGER_PASSCODE ?? "letmein";

/** Long enough for a viewer to actually read the screen before it moves on. */
const BEAT = 2200;
const beat = (ms = BEAT) => new Promise((r) => setTimeout(r, ms));

/**
 * A caption burned into the page itself rather than added in post. Keeps the
 * text in sync with what is on screen no matter how the timing drifts.
 */
async function caption(page: Page, text: string, holdMs = 3000) {
  await page.evaluate((t) => {
    let el = document.getElementById("__demo_caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "__demo_caption";
      el.style.cssText = [
        "position:fixed", "left:50%", "bottom:36px", "transform:translateX(-50%)",
        "background:rgba(10,12,14,.93)", "color:#F2F5F6", "padding:13px 26px",
        "border-radius:9px", "font:500 17px/1.45 ui-sans-serif,system-ui,sans-serif",
        "max-width:min(78vw,760px)", "text-align:center", "z-index:2147483647",
        "box-shadow:0 8px 32px rgba(0,0,0,.45)", "border:1px solid rgba(255,255,255,.14)",
        "opacity:0", "transition:opacity .35s ease", "pointer-events:none",
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

/** Scroll far enough to reveal a section, slowly enough to read on playback. */
async function glide(page: Page, selector: string) {
  const target = page.locator(selector).first();
  if (await target.count()) {
    await target.scrollIntoViewIfNeeded();
    await beat(900);
  }
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
    colorScheme: "dark",
  });
  const page = await context.newPage();

  // The manager pages read the passcode from sessionStorage, the same way a
  // manager who has already searched once would have it.
  await page.goto(BASE);
  await page.evaluate((p) => sessionStorage.setItem("hs_passcode", p), PASSCODE);

  // ---- 1. what it is -------------------------------------------------
  await page.goto(BASE, { waitUntil: "networkidle" });
  await beat(1200);
  await caption(page, "HireScope runs a structured interview from the candidate's own resume.", 3600);
  await clearCaption(page);
  await glide(page, "text=What this system does not do");
  await caption(page, "No camera, no gaze tracking, no emotion inference — by design.", 3600);
  await clearCaption(page);

  // ---- 2. the standard lives outside the code ------------------------
  await page.goto(`${BASE}/apply`, { waitUntil: "networkidle" });
  await beat(900);
  await caption(page, "A role exists when its criteria file does. Twenty roles ship today.", 3400);
  await clearCaption(page);

  const roleSelect = page.locator("select").first();
  if (await roleSelect.count()) {
    await roleSelect.scrollIntoViewIfNeeded();
    await roleSelect.click({ timeout: 4000 }).catch(() => {});
    await beat(1400);
    await page.keyboard.press("Escape").catch(() => {});
  }

  // ---- 3. a real interview turn --------------------------------------
  await caption(page, "The candidate uploads a resume; the questions come from what it claims.", 3600);
  await clearCaption(page);

  await page.setInputFiles('input[type="file"]', path.resolve("examples/example-resume.txt")).catch(() => {});
  await page.fill('input[type="email"]', "demo.candidate@example.com").catch(() => {});
  await beat(700);

  // Consent is part of the product, so it is part of the demo.
  await glide(page, "text=Your consent");
  await caption(page, "Consent is per-purpose, recorded with the policy version the candidate saw.", 3800);
  await clearCaption(page);

  for (const box of await page.locator('input[type="checkbox"]').all()) {
    await box.check({ timeout: 2000 }).catch(() => {});
    await beat(280);
  }

  await caption(page, "Submitting reads the resume and builds an interview plan. This is live.", 3000);
  const submit = page.locator("button", { hasText: /begin|start/i }).first();
  await submit.click({ timeout: 5000 }).catch(() => {});

  // Two real model calls; roughly a minute. Trimmed out in post.
  await page.waitForURL(/\/interview\//, { timeout: 180_000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await beat(1500);
  await clearCaption(page);
  await caption(page, "The opening question, generated from this candidate's own history.", 4600);
  await clearCaption(page);

  // ---- 4. what a manager actually reads ------------------------------
  await page.goto(`${BASE}/manager/candidates`, { waitUntil: "networkidle" });
  await beat(1200);
  await caption(page, "Every assessed candidate, ranked — and never hidden for scoring badly.", 3800);
  await clearCaption(page);
  await page.mouse.wheel(0, 520); await beat(1500);
  await page.mouse.wheel(0, 520); await beat(1500);

  // ---- 5. the evidence behind a score --------------------------------
  const firstCard = page.locator('a[href*="/manager/candidate/"]').first();
  if (await firstCard.count()) {
    await firstCard.click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await beat(1600);
  }
  await caption(page, "A skill diagram drawn from the role's own competencies.", 3600);
  await clearCaption(page);
  await glide(page, "text=Competency detail");
  await caption(page, "Every score carries the quote that justifies it. Untested ones say so.", 4200);
  await clearCaption(page);
  await page.mouse.wheel(0, 700); await beat(1600);
  await glide(page, "text=Tags");
  await caption(page, "Demonstrated in the interview, or merely claimed on the resume.", 4000);
  await clearCaption(page);

  // ---- 6. search over evidence ---------------------------------------
  await page.goto(`${BASE}/manager`, { waitUntil: "networkidle" });
  await beat(1000);
  await caption(page, "Managers search in plain English.", 2600);
  await clearCaption(page);
  const box = page.locator('input[type="text"], input:not([type])').first();
  await box.click().catch(() => {});
  await box.type("Software engineer who has experience with PyTorch", { delay: 42 }).catch(() => {});
  await beat(900);

  // ---- 7. the part most systems leave out ----------------------------
  await page.goto(`${BASE}/governance`, { waitUntil: "networkidle" });
  await beat(1100);
  await caption(page, "And a page saying plainly what the system will not do, and what is still owed.", 4400);
  await clearCaption(page);
  await page.mouse.wheel(0, 700); await beat(1700);
  await page.mouse.wheel(0, 700); await beat(1700);

  await context.close();
  await browser.close();
  console.log(`Raw recording written to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
