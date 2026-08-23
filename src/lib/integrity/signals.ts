/**
 * Interview integrity, without biometrics.
 *
 * What this deliberately does NOT do: no face detection, no gaze tracking, no
 * emotion or affect inference, no voice-stress analysis. Inferring emotion from a
 * candidate in an employment context is prohibited outright by EU AI Act Art.
 * 5(1)(f), and face/eye biometric templates trigger Illinois BIPA and Texas CUBI
 * consent-and-retention regimes with per-violation statutory damages.
 *
 * What it does instead: behavioural telemetry that a browser can observe without
 * processing anyone's body. In practice these catch actual cheating better than
 * gaze tracking, because the failure mode of cheating is looking somewhere else
 * on the same machine, pasting, or answering in a register that is not yours.
 *
 * Every signal here is advisory. The report says what was observed and how
 * unusual it is. It never returns a verdict, because "this person cheated" is a
 * human judgement that has to survive being wrong.
 */

export type SignalType =
  | "blur"            // window lost focus
  | "tab_hidden"      // visibilitychange fired
  | "paste"           // paste into the answer box
  | "copy"            // copy out of the question
  | "fullscreen_exit"
  | "devtools"
  | "second_voice";   // audio VAD detected an additional speaker (presence only)

export type RawSignal = { type: SignalType; at: string; payload?: Record<string, unknown> };

export type TimingRecord = {
  turnIdx: number;
  latencyMsFirstKey: number | null;
  latencyMsSubmit: number | null;
  charCount: number;
};

export type IntegrityReport = {
  /** 0-100. Higher means more anomalous. Not a probability of cheating. */
  anomalyScore: number;
  band: "nothing_notable" | "minor" | "worth_review" | "review_required";
  observations: { label: string; detail: string; weight: number }[];
  counts: Record<string, number>;
  /** Shown verbatim to the reviewing manager, so the number is never read alone. */
  caveat: string;
};

const WEIGHTS: Record<SignalType, number> = {
  blur: 4,
  tab_hidden: 6,
  paste: 12,
  copy: 3,
  fullscreen_exit: 5,
  devtools: 15,
  second_voice: 10,
};

const CAVEAT =
  "These are behavioural observations, not proof. Every one of them has an innocent "
  + "explanation: a notification stole focus, the candidate drafted in a notes app, "
  + "someone else was in the room. Treat a high score as a reason to ask, never as a "
  + "reason to reject. This system does not analyse faces, gaze, or emotion.";

export function buildIntegrityReport(
  signals: RawSignal[],
  timings: TimingRecord[],
  stylometry?: { turnIdx: number; machineLikelihood: number; reason: string }[],
): IntegrityReport {
  const counts: Record<string, number> = {};
  for (const s of signals) counts[s.type] = (counts[s.type] ?? 0) + 1;

  const observations: IntegrityReport["observations"] = [];
  let score = 0;

  for (const [type, count] of Object.entries(counts) as [SignalType, number][]) {
    // Diminishing returns: ten focus losses is not ten times one focus loss.
    const weighted = WEIGHTS[type] * Math.log2(count + 1);
    score += weighted;
    observations.push({
      label: labelFor(type, count),
      detail: detailFor(type, count),
      weight: Math.round(weighted),
    });
  }

  // Answer timing. The signal we care about is a long silence followed by a long,
  // fluent answer typed fast — the shape of reading something off a second screen.
  for (const t of timings) {
    if (t.latencyMsFirstKey === null || t.latencyMsSubmit === null) continue;
    const thinkSeconds = t.latencyMsFirstKey / 1000;
    const typeSeconds = Math.max(1, (t.latencyMsSubmit - t.latencyMsFirstKey) / 1000);
    const charsPerSecond = t.charCount / typeSeconds;

    if (thinkSeconds > 25 && charsPerSecond > 12 && t.charCount > 400) {
      score += 10;
      observations.push({
        label: "Long pause, then fast fluent answer",
        detail:
          `Turn ${t.turnIdx + 1}: ${Math.round(thinkSeconds)}s before typing began, then `
          + `${t.charCount} characters at ${charsPerSecond.toFixed(1)} chars/sec. Sustained `
          + `typing at that rate usually means transcribing rather than composing.`,
        weight: 10,
      });
    }
  }

  for (const s of stylometry ?? []) {
    if (s.machineLikelihood >= 0.6) {
      const weight = Math.round(s.machineLikelihood * 18);
      score += weight;
      observations.push({
        label: "Answer reads as machine-generated",
        detail: `Turn ${s.turnIdx + 1}: ${s.reason}`,
        weight,
      });
    }
  }

  const anomalyScore = Math.min(100, Math.round(score));
  return {
    anomalyScore,
    band:
      anomalyScore >= 55 ? "review_required"
      : anomalyScore >= 30 ? "worth_review"
      : anomalyScore >= 12 ? "minor"
      : "nothing_notable",
    observations: observations.sort((a, b) => b.weight - a.weight),
    counts,
    caveat: CAVEAT,
  };
}

function labelFor(type: SignalType, count: number): string {
  const n = count === 1 ? "once" : `${count} times`;
  switch (type) {
    case "blur": return `Window lost focus ${n}`;
    case "tab_hidden": return `Tab hidden ${n}`;
    case "paste": return `Pasted into the answer box ${n}`;
    case "copy": return `Copied text out ${n}`;
    case "fullscreen_exit": return `Left fullscreen ${n}`;
    case "devtools": return `Developer tools opened ${n}`;
    case "second_voice": return `Another voice detected ${n}`;
  }
}

function detailFor(type: SignalType, count: number): string {
  switch (type) {
    case "blur":
    case "tab_hidden":
      return "The interview tab was not the active window. Common causes include notifications and second monitors.";
    case "paste":
      return `${count} paste event(s). The pasted length is recorded; the content is not.`;
    case "copy":
      return "Question text was copied to the clipboard.";
    case "fullscreen_exit":
      return "The candidate exited fullscreen during the session.";
    case "devtools":
      return "A developer-tools open was detected via viewport heuristics. Unreliable on small screens.";
    case "second_voice":
      return "Voice activity detection registered speech overlapping the candidate. Presence only — no voice is identified, stored, or analysed for emotion.";
  }
}
