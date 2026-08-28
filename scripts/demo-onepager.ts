/**
 * Renders the Day 7 one-pager: problem definition card + design summary, A4.
 *
 *   npm run demo:onepager
 *
 * Numbers marked 실측 are measured from this system and reproducible from the
 * repository. The one external statistic is deliberately left as a blank for the
 * team to fill with a source they can stand behind — a fabricated citation is
 * worse than an obvious gap.
 */

import { chromium } from "playwright";
import path from "node:path";

const HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>
  @page{size:A4;margin:11mm 12mm;}
  *{box-sizing:border-box;margin:0;}
  body{
    font-family:"Noto Sans KR",sans-serif;font-size:8.4pt;line-height:1.46;
    color:#16191C;-webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
  .mast{display:flex;align-items:baseline;justify-content:space-between;
    border-bottom:1.6pt solid #16191C;padding-bottom:4pt;margin-bottom:8pt;}
  .mast h1{font-size:15pt;font-weight:700;letter-spacing:-.3pt;}
  .mast .m{font-family:"IBM Plex Mono",monospace;font-size:7pt;color:#6B7378;}

  h2{font-size:9.6pt;font-weight:700;margin:9pt 0 4pt;padding-left:6pt;border-left:2.6pt solid #17707F;}
  h2:first-of-type{margin-top:0;}
  h3{font-size:8.2pt;font-weight:700;color:#2E3438;margin:6pt 0 2.5pt;}

  .stmt{background:#F2F6F7;border:.7pt solid #CDDBDE;border-radius:3pt;
    padding:7pt 9pt;font-size:10pt;line-height:1.5;font-weight:500;}
  .stmt b{color:#0F5C68;font-weight:700;}

  ul{margin:0;padding-left:11pt;}
  li{margin-bottom:1.6pt;}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:0 12pt;}
  .three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 10pt;}

  table{border-collapse:collapse;width:100%;font-size:7.9pt;margin-top:2pt;}
  th,td{border:.6pt solid #C9D2D5;padding:3pt 5pt;vertical-align:top;text-align:left;}
  th{background:#EDF2F3;font-weight:700;font-size:7.4pt;}
  td.k{width:88pt;font-weight:500;background:#F7FAFA;}

  .tag{display:inline-block;font-family:"IBM Plex Mono",monospace;font-size:6.4pt;
    padding:.8pt 3.4pt;border-radius:2pt;background:#DCEAEC;color:#0F5C68;margin-right:3pt;}
  .tag.warn{background:#FBEBD4;color:#8A5B12;}
  .tag.no{background:#F7DEDB;color:#8E3A31;}
  .fill{background:#FFF6DC;border-bottom:.8pt dashed #C89B2E;padding:0 14pt;}
  .note{font-size:7.2pt;color:#6B7378;margin-top:2.5pt;line-height:1.4;}
  footer{margin-top:9pt;padding-top:4pt;border-top:.6pt solid #D3DADD;
    font-size:6.9pt;color:#78838A;line-height:1.4;}
</style></head><body>

<div class="mast">
  <h1>HireScope — 문제 정의 &amp; 설계 요약</h1>
  <div class="m">Day 7 · 이력서 기반 AI 면접 및 역량 평가</div>
</div>

<h2>1. 문제 정의</h2>

<div class="stmt">
  우리는 <b>채용 담당자</b>가 <b>이력서에 적힌 주장을 검증할 방법 없이 사람을 골라내서</b>
  생기는 <b>“근거를 댈 수 없는 선별”</b> 문제를 푼다.
</div>

<h3>뒷받침 숫자와 출처</h3>
<ul>
  <li><span class="tag">실측</span> 데모 이력서 1장에서 <b>기술 15개</b>가 나열되어 있으나 어느 경력에서도 설명되지 않음.
      — 시스템의 이력서 자기검증 결과 <span class="m">(verification findings, skill_unsupported)</span></li>
  <li><span class="tag">실측</span> 8턴 면접 후 8개 역량 중 <b>7개만</b> 근거 확보. 나머지 1개는 점수를 매기지 않고 ‘미도달’로 표기.
      — 즉, 면접 한 번으로 전부 판단할 수 있다는 전제 자체가 틀림</li>
  <li><span class="tag">실측</span> 20개 직무 기준 파일에 역량 163개, 고유 키 86개. 직무별 기준이 실제로 다름
      — 하나의 공통 평가표로 전 직무를 덮을 수 없음</li>
  <li><span class="tag warn">출처 필요</span> 이력서 허위·과장 기재 비율:
      <span class="fill">&nbsp;</span>% <span class="fill">&nbsp;</span>
      <span class="note" style="display:inline">← 팀이 인용 가능한 국내 조사로 채울 것. 추정치를 쓰지 말 것.</span></li>
</ul>

<div class="two">
  <div>
    <h3>이번에 풀지 않을 범위</h3>
    <ul>
      <li><span class="tag no">제외</span> 최종 합격·불합격 결정 — 사람이 한다</li>
      <li><span class="tag no">제외</span> 얼굴·시선·감정 분석 — EU AI Act 5조 금지</li>
      <li><span class="tag no">제외</span> SNS·외부 평판 조회 — FCRA·차별 위험</li>
      <li><span class="tag warn">미구현</span> 영상·음성 면접 — 설계만 완료</li>
      <li><span class="tag warn">미구현</span> 편향 감사, 보관·삭제 정책</li>
    </ul>
  </div>
  <div>
    <h3>성공의 정의</h3>
    <ul>
      <li>어떤 점수든 <b>“근거가 뭐냐”에 인용문으로</b> 답할 수 있다</li>
      <li>이력서 <b>주장</b>과 면접 <b>입증</b>이 구분되어 검색된다</li>
      <li>3개월 뒤에도 <b>당시 기준</b>으로 그 평가를 다시 읽을 수 있다</li>
      <li>지원자가 자기 평가를 열람하고 <b>이의를 남길</b> 수 있다</li>
      <li>총점을 <b>손으로 검산</b>할 수 있다</li>
    </ul>
  </div>
</div>

<h2>2. 설계 요약</h2>

<h3>자동 처리와 사람 개입의 경계</h3>
<table>
  <tr><th style="width:88pt">구분</th><th>자동</th><th>사람</th></tr>
  <tr>
    <td class="k">하는 일</td>
    <td>이력서 파싱 · 질문 생성 · 답변 평가와 인용 · 점수 계산 · 태그 부여 · 무결성 신호 수집</td>
    <td>평가 기준 파일 작성 · 채용 여부 결정 · 신뢰도 낮은 항목 검토 · 무결성 신호 해석</td>
  </tr>
  <tr>
    <td class="k">경계의 기준</td>
    <td colspan="2">
      되돌릴 수 없는 결정과 <b>기준 그 자체</b>는 사람이 한다. 시스템은 근거를 만들고 사람이 판단한다.
      그리고 <b>인용할 수 없으면 점수를 내지 않는다</b> — 모르는 것은 낮은 점수가 아니라 ‘미도달’이다.
    </td>
  </tr>
</table>

<h3>도입 전후, 담당자의 하루</h3>
<table>
  <tr><th style="width:88pt">단계</th><th>전</th><th>후</th></tr>
  <tr><td class="k">서류 검토</td>
    <td>이력서를 훑고 감으로 추림. 왜 그 사람인지 나중에 설명하지 못함</td>
    <td>지원자가 스스로 20분 면접을 완료. 근거가 붙은 카드가 쌓임</td></tr>
  <tr><td class="k">후보 찾기</td>
    <td>스프레드시트를 눈으로 훑음. 키워드가 이력서에 있는지만 확인</td>
    <td>문장으로 검색. <b>입증된</b> 역량이 <b>주장</b>보다 위로 올라옴</td></tr>
  <tr><td class="k">면접 준비</td>
    <td>매번 처음부터. 무엇을 물어볼지 사람마다 다름</td>
    <td>미도달 역량과 이의 제기 항목이 이미 정리되어 있음</td></tr>
</table>

<div class="two" style="margin-top:6pt">
  <div>
    <h3>결과를 믿게 만드는 장치</h3>
    <ul>
      <li><b>판단 기록</b> — 모든 점수에 지원자의 발언을 인용</li>
      <li><b>기준 고정</b> — 기준 파일을 해시로 버전화. 파일을 고쳐도 과거 평가는 당시 기준에 묶임</li>
      <li><b>총점은 코드가</b> — 가중평균(high 3 / medium 2 / low 1)은 함수 하나가 계산. 모델이 총점을 만들지 않음</li>
      <li><b>모르는 것의 표시</b> — 미도달 역량은 0점이 아니라 평균에서 제외하고 개수를 함께 표기</li>
      <li><b>추적</b> — 기준 버전·동의·전문·점수·근거를 마크다운 1파일로 내보내기</li>
      <li><b>분리</b> — 무결성 신호는 점수에 반영되지 않고 따로 보고</li>
    </ul>
  </div>
  <div>
    <h3>예상 위험과 대응</h3>
    <table>
      <tr><td class="k" style="width:64pt">편향</td>
        <td>보호 속성 질문 금지 + 점수 반영 금지. <span class="tag warn">필수</span> 연 1회 편향 감사는 아직 없음</td></tr>
      <tr><td class="k">모델 과신</td>
        <td>인용 없으면 점수 없음 · 미도달 표기 · 사람 검토를 전제로 문구 고정</td></tr>
      <tr><td class="k">지원자 불신</td>
        <td>본인 리포트 열람 + 이의 제기 기록. 무결성 점수는 ‘증거 아님’ 명시</td></tr>
      <tr><td class="k">부정행위</td>
        <td>비생체 신호만 수집(창 전환·붙여넣기·타이밍). 오탐 가능성을 화면에 함께 표기</td></tr>
      <tr><td class="k">법규</td>
        <td>감정 추론 미사용. <span class="tag warn">미완</span> EU AI Act 고위험 문서화, 보관·삭제 정책</td></tr>
    </table>
  </div>
</div>

<footer>
  ‘실측’ 표기 수치는 이 시스템에서 측정되었고 저장소에서 재현 가능합니다.
  ‘출처 필요’ 항목은 팀이 인용 가능한 자료로 채워야 하며, 추정치를 넣지 않았습니다.
  데모에 등장하는 지원자는 가상의 인물입니다. · github.com/jaewoo001/hirescope
</footer>
</body></html>`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(HTML, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const pdf = path.resolve("demo/1-2-problem-and-design.pdf");
  await page.pdf({ path: pdf, format: "A4", printBackground: true });

  // A PNG too, for pasting straight into a slide or a chat.
  await page.setViewportSize({ width: 1240, height: 600 });
  await page.screenshot({ path: path.resolve("demo/1-2-problem-and-design.png"), fullPage: true });

  await browser.close();
  console.log(`  wrote ${pdf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
