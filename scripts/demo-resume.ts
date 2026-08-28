/**
 * Renders the demo resume as a real PDF.
 *
 * The demo previously uploaded a plain .txt, which skipped the PDF extraction
 * path entirely — the path every real candidate actually uses. This renders a
 * normal-looking two-column-ish resume and prints it through Chromium, so the
 * recording exercises unpdf for real.
 *
 * The person is invented. The name is the project owner's because a demo reads
 * better with a familiar name on it; every company, date, and number below is
 * fiction.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("examples");

const RESUME = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap">
<style>
  @page { size: A4; margin: 14mm 16mm; }
  body{
    font-family:"Source Sans 3",Calibri,Arial,sans-serif;
    font-size:10.2pt; line-height:1.42; color:#1a1a1a; margin:0;
  }
  h1{font-size:20pt;margin:0 0 2pt;letter-spacing:-.4pt;}
  .contact{font-size:9pt;color:#444;margin-bottom:12pt;}
  h2{
    font-size:9.5pt;text-transform:uppercase;letter-spacing:1.1pt;
    border-bottom:1px solid #bbb;padding-bottom:2pt;margin:14pt 0 7pt;
  }
  .role{display:flex;justify-content:space-between;margin-top:9pt;}
  .role b{font-size:10.8pt;}
  .role .when{color:#555;font-size:9.2pt;white-space:nowrap;}
  .where{color:#555;font-size:9.4pt;margin-bottom:3pt;}
  ul{margin:3pt 0 0;padding-left:14pt;}
  li{margin-bottom:2.5pt;}
  .skills{display:grid;grid-template-columns:88pt 1fr;gap:3pt 8pt;font-size:9.6pt;}
  .skills dt{font-weight:600;color:#333;}
  .summary{font-size:10pt;color:#222;}
</style></head><body>

<h1>JaeWoo Kim</h1>
<div class="contact">
  Seoul, South Korea &nbsp;·&nbsp; jaewoo.kim@example.com &nbsp;·&nbsp; +82 10 5550 3318
  &nbsp;·&nbsp; github.com/jaewoo-kim-demo
</div>

<p class="summary">
  Backend engineer with six years building payment and settlement systems, most recently
  owning the reconciliation service at a Series B fintech. Comfortable where correctness
  matters more than throughput. Increasingly working on ML-backed fraud scoring.
</p>

<h2>Experience</h2>

<div class="role"><b>Senior Backend Engineer</b><span class="when">Mar 2022 &ndash; Present</span></div>
<div class="where">Danal Fintech, Seoul</div>
<ul>
  <li>Own the settlement service reconciling ~400,000 card transactions daily against six acquirer statements.</li>
  <li>Rebuilt the matcher after a partial-capture assumption caused 4,100 false exceptions in one night; cut steady-state exceptions from ~900/day to under 200.</li>
  <li>Introduced idempotency keys across the payment API after a retry storm double-charged 1,100 customers in March 2023.</li>
  <li>Led migration from a nightly batch to streaming reconciliation, cutting dispute resolution from 48 hours to under 4.</li>
</ul>

<div class="role"><b>Backend Engineer</b><span class="when">Aug 2019 &ndash; Feb 2022</span></div>
<div class="where">Kakao Commerce, Pangyo</div>
<ul>
  <li>Built the order-state machine behind checkout, handling ~2M orders/month at peak.</li>
  <li>Diagnosed and fixed a timezone bug in the nightly settlement job that mis-dated any transaction settling after 16:00 KST.</li>
  <li>Reduced p99 checkout latency from 840ms to 310ms by removing a synchronous inventory call.</li>
</ul>

<div class="role"><b>Software Engineer</b><span class="when">Jul 2018 &ndash; Jul 2019</span></div>
<div class="where">Naver Pay, Seongnam</div>
<ul>
  <li>Maintained internal ledger tooling; wrote the first integration test suite for the ledger service.</li>
</ul>

<h2>Selected Project</h2>
<div class="role"><b>Fraud scoring prototype</b><span class="when">2024</span></div>
<ul>
  <li>Trained a gradient-boosted model on 18 months of chargeback data; shadow-deployed against the rules engine for six weeks.</li>
  <li>Held it back from production after precision fell below the rules engine on the cases that mattered most.</li>
</ul>

<h2>Education</h2>
<div class="role"><b>BSc, Mechanical and Aerospace Engineering</b><span class="when">2014 &ndash; 2018</span></div>
<div class="where">Seoul National University</div>

<h2>Skills</h2>
<dl class="skills">
  <dt>Languages</dt><dd>Go, Python, TypeScript, SQL</dd>
  <dt>Data</dt><dd>PostgreSQL, Kafka, Redis, Spark</dd>
  <dt>ML</dt><dd>PyTorch, scikit-learn, XGBoost</dd>
  <dt>Infrastructure</dt><dd>Kubernetes, Terraform, AWS</dd>
  <dt>Domain</dt><dd>Payments, settlement, reconciliation, PCI DSS</dd>
</dl>

</body></html>`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(RESUME, { waitUntil: "networkidle" });
  await page.waitForTimeout(700); // let the webfont land before printing
  const file = path.join(OUT, "demo-resume-jaewoo-kim.pdf");
  await page.pdf({ path: file, format: "A4", printBackground: true });
  await browser.close();
  console.log(`  wrote ${file}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
