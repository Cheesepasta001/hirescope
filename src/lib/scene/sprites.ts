import type { CandidatePalette } from "./palette";

export type Ctx = CanvasRenderingContext2D;

/** Integer-aligned fill — the only drawing primitive the sprites use, so
 *  nothing ever lands on a half-pixel and softens the art. */
export function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export type SpriteState = {
  /** 0 or 1 — the idle breathing loop. */
  breath: number;
  /** true for the few frames of a blink. */
  blinking: boolean;
  /** true while this candidate is spotlighted. */
  selected: boolean;
  /** -1, 0 or 1 — where the eyes are pointed. Candidates glance sideways at
   *  each other while they wait; it is the cheapest possible sign of life. */
  glance?: -1 | 0 | 1;
  /** true when the eyes are up on the AI terminal, which is scoring them. */
  lookUp?: boolean;
  /** 0 or 1 — a hand lifting off the desk. Fidgeting, not gesturing. */
  fidget?: 0 | 1;
  /** 0 or 1 — the walk-cycle bob, used while crossing the room. */
  bob?: 0 | 1;
};

/**
 * Candidate sprite, 32x32, seated and facing the viewer (i.e. facing the HR desk).
 * Shared rig across every candidate — only palette, hair silhouette, collar and
 * glasses change, so the row reads as one panel of people rather than a zoo.
 */
export function drawCandidate(
  ctx: Ctx,
  ox: number,
  oy: number,
  p: CandidatePalette,
  s: SpriteState,
) {
  const b = s.breath; // 0 or 1 px of vertical give in the torso
  const X = (n: number) => ox + n;
  const Y = (n: number) => oy + n;

  // ── body / shoulders ───────────────────────────────────────────────
  px(ctx, X(5), Y(19 + b), 22, 13, p.outfitShade); // torso block
  px(ctx, X(6), Y(20 + b), 20, 12, p.outfit);
  px(ctx, X(4), Y(21 + b), 3, 11, p.outfitShade); // left arm
  px(ctx, X(25), Y(21 + b), 3, 11, p.outfitShade); // right arm
  px(ctx, X(5), Y(28 + b), 2, 4, p.skinShade); // left hand on the desk
  const f = s.fidget ?? 0;
  px(ctx, X(25), Y(28 + b - f * 2), 2, 4 + f * 2, p.skinShade); // right hand

  // ── collar / neckline: three variants, same footprint ──────────────
  if (p.collar === 0) {
    px(ctx, X(13), Y(19 + b), 6, 5, "#e6e6ee"); // open shirt
    px(ctx, X(15), Y(20 + b), 2, 8, p.accent); // tie
    px(ctx, X(14), Y(28 + b), 4, 2, p.accent);
  } else if (p.collar === 1) {
    px(ctx, X(12), Y(19 + b), 8, 3, "#dfe3ee"); // round collar
    px(ctx, X(13), Y(22 + b), 6, 2, p.outfitShade);
  } else {
    px(ctx, X(12), Y(19 + b), 8, 2, p.accent); // scarf / crew neck
    px(ctx, X(11), Y(21 + b), 10, 1, p.outfitShade);
  }

  // ── neck ───────────────────────────────────────────────────────────
  px(ctx, X(14), Y(16), 4, 4, p.skinShade);

  // ── head ───────────────────────────────────────────────────────────
  px(ctx, X(10), Y(4), 12, 13, p.skin);
  px(ctx, X(10), Y(4), 12, 2, p.skinShade); // brow shading
  px(ctx, X(9), Y(8), 1, 4, p.skinShade); // left ear
  px(ctx, X(22), Y(8), 1, 4, p.skinShade); // right ear
  px(ctx, X(10), Y(15), 12, 2, p.skinShade); // jaw shadow

  // ── hair: four silhouettes over the same skull ─────────────────────
  px(ctx, X(9), Y(2), 14, 4, p.hair);
  px(ctx, X(10), Y(1), 12, 1, p.hairShade);
  if (p.hairStyle === 0) {
    px(ctx, X(9), Y(5), 2, 4, p.hair); // short, tight sides
    px(ctx, X(21), Y(5), 2, 4, p.hair);
    px(ctx, X(10), Y(5), 12, 1, p.hairShade);
  } else if (p.hairStyle === 1) {
    px(ctx, X(8), Y(4), 3, 10, p.hair); // chin-length bob
    px(ctx, X(21), Y(4), 3, 10, p.hair);
    px(ctx, X(8), Y(13), 3, 1, p.hairShade);
    px(ctx, X(21), Y(13), 3, 1, p.hairShade);
  } else if (p.hairStyle === 2) {
    px(ctx, X(8), Y(3), 16, 3, p.hair); // long, past the shoulder
    px(ctx, X(7), Y(5), 3, 15, p.hair);
    px(ctx, X(22), Y(5), 3, 15, p.hair);
    px(ctx, X(7), Y(19), 3, 1, p.hairShade);
    px(ctx, X(22), Y(19), 3, 1, p.hairShade);
  } else {
    px(ctx, X(9), Y(1), 14, 3, p.hair); // pulled back with a bun
    px(ctx, X(14), Y(0), 5, 2, p.hairShade);
    px(ctx, X(9), Y(4), 2, 3, p.hair);
    px(ctx, X(21), Y(4), 2, 3, p.hair);
  }

  // ── face ───────────────────────────────────────────────────────────
  if (s.blinking) {
    px(ctx, X(12), Y(10), 3, 1, p.skinShade);
    px(ctx, X(17), Y(10), 3, 1, p.skinShade);
  } else {
    px(ctx, X(12), Y(9), 3, 2, "#f4f6fb");
    px(ctx, X(17), Y(9), 3, 2, "#f4f6fb");
    const gx = s.glance ?? 0;
    const gy = s.lookUp ? -1 : 0;
    px(ctx, X(13 + gx), Y(9 + gy), 1, 2 + gy * -1, "#1a1f2e"); // pupils
    px(ctx, X(18 + gx), Y(9 + gy), 1, 2 + gy * -1, "#1a1f2e");
  }
  px(ctx, X(15), Y(11), 2, 2, p.skinShade); // nose
  px(ctx, X(14), Y(14), 4, 1, p.skinShade); // mouth

  if (p.glasses) {
    // thin rims only — a filled block reads as sunglasses at this scale
    const rim = "#39405c";
    px(ctx, X(11), Y(8), 5, 1, rim);
    px(ctx, X(11), Y(11), 5, 1, rim);
    px(ctx, X(11), Y(8), 1, 4, rim);
    px(ctx, X(15), Y(8), 1, 4, rim);
    px(ctx, X(16), Y(8), 5, 1, rim);
    px(ctx, X(16), Y(11), 5, 1, rim);
    px(ctx, X(16), Y(8), 1, 4, rim);
    px(ctx, X(20), Y(8), 1, 4, rim);
    px(ctx, X(9), Y(9), 2, 1, rim); // temples
    px(ctx, X(21), Y(9), 2, 1, rim);
  }

  // ── selected: a hard rim-light down the spotlit side ────────────────
  if (s.selected) {
    px(ctx, X(9), Y(4), 1, 12, "#ffe9b8");
    px(ctx, X(8), Y(3), 1, 3, "#ffe9b8");
    px(ctx, X(4), Y(21 + b), 1, 11, "#f2b544");
  }
}

/** Empty chair behind a vacant seat — pushed back from the desk, unused. */
export function drawEmptyChair(ctx: Ctx, cx: number, baseY: number) {
  // backrest
  px(ctx, cx - 10, baseY - 26, 20, 15, "#1b2038");
  px(ctx, cx - 10, baseY - 26, 20, 2, "#2e3757");
  px(ctx, cx - 10, baseY - 13, 20, 2, "#10142a");
  px(ctx, cx - 8, baseY - 23, 16, 10, "#161b30"); // cushion inset
  px(ctx, cx - 8, baseY - 23, 16, 1, "#242c4a");
  // stem and seat
  px(ctx, cx - 2, baseY - 11, 4, 5, "#12162a");
  px(ctx, cx - 11, baseY - 7, 22, 3, "#1b2038");
  px(ctx, cx - 11, baseY - 7, 22, 1, "#2e3757");
  // castors
  px(ctx, cx - 10, baseY - 4, 3, 3, "#10142a");
  px(ctx, cx + 7, baseY - 4, 3, 3, "#10142a");
}

/**
 * A 3x5 pixel font — just enough letters for the VACANT plate. Anything
 * longer belongs in the DOM, not the canvas.
 */
const GLYPHS: Record<string, string[]> = {
  V: ["101", "101", "101", "101", "010"],
  A: ["010", "101", "111", "101", "101"],
  C: ["011", "100", "100", "100", "011"],
  N: ["101", "111", "111", "111", "101"],
  T: ["111", "010", "010", "010", "010"],
};

/** Draw uppercase text in the 3x5 font. Unknown characters render as a gap. */
export function drawTinyText(ctx: Ctx, text: string, x: number, y: number, color: string) {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch];
    if (glyph) {
      glyph.forEach((row, ry) => {
        [...row].forEach((bit, rx) => {
          if (bit === "1") px(ctx, cx + rx, y + ry, 1, 1, color);
        });
      });
    }
    cx += 4;
  }
}

/** Width in pixels the 3x5 font needs for a string. */
export function tinyTextWidth(text: string): number {
  return Math.max(0, text.length * 4 - 1);
}

/**
 * HR interviewer, seen from behind at the foreground desk.
 *
 * Same rig as the candidates — same proportions, same one-pixel detail
 * density, same palette generator — just scaled up and turned around, so the
 * judge reads as one of the same cast sitting closer to the camera rather than
 * as a different kind of drawing. Anchored below the candidate row, so it never
 * occludes a seat.
 */
export function drawHRBack(
  ctx: Ctx,
  cx: number,
  baseY: number,
  p: CandidatePalette,
  breath: number,
) {
  const b = breath;
  const headTop = baseY - 76; // 140 at a 216-tall scene

  // ── chair, behind everything ───────────────────────────────────────
  px(ctx, cx - 26, baseY - 38, 52, 38, "#161b30");
  px(ctx, cx - 26, baseY - 38, 52, 2, "#242c4a");
  px(ctx, cx - 28, baseY - 32, 2, 32, "#10142a");
  px(ctx, cx + 26, baseY - 32, 2, 32, "#10142a");

  // ── torso ──────────────────────────────────────────────────────────
  px(ctx, cx - 18, baseY - 45 + b, 36, 45, p.outfitShade);
  px(ctx, cx - 16, baseY - 43 + b, 32, 43, p.outfit);
  px(ctx, cx - 23, baseY - 40 + b, 5, 32, p.outfitShade); // left arm
  px(ctx, cx + 18, baseY - 40 + b, 5, 32, p.outfitShade); // right arm
  px(ctx, cx - 1, baseY - 41 + b, 2, 41, p.outfitShade); // centre seam
  px(ctx, cx - 15, baseY - 45 + b, 30, 2, p.outfit); // shoulder line

  // ── collar, the one bright note, matched to the candidates' rig ────
  if (p.collar === 2) {
    px(ctx, cx - 12, baseY - 48 + b, 24, 3, p.accent);
  } else {
    px(ctx, cx - 12, baseY - 48 + b, 24, 4, "#dfe3ee");
    px(ctx, cx - 10, baseY - 45 + b, 20, 2, p.outfitShade);
  }

  // ── neck ───────────────────────────────────────────────────────────
  px(ctx, cx - 6, baseY - 54, 12, 8, p.skinShade);
  px(ctx, cx - 6, baseY - 50, 12, 2, "#2a2220");

  // ── back of the head: all hair, no face ────────────────────────────
  px(ctx, cx - 10, headTop + 4, 20, 22, p.hair);
  px(ctx, cx - 8, headTop + 2, 16, 2, p.hair);
  px(ctx, cx - 6, headTop, 12, 2, p.hairShade);
  px(ctx, cx - 10, headTop + 22, 20, 3, p.hairShade); // nape
  px(ctx, cx - 12, headTop + 12, 2, 5, p.skinShade); // ears
  px(ctx, cx + 10, headTop + 12, 2, 5, p.skinShade);

  // hair silhouette follows the same four styles the candidates use
  if (p.hairStyle === 1) {
    px(ctx, cx - 13, headTop + 8, 3, 22, p.hair);
    px(ctx, cx + 10, headTop + 8, 3, 22, p.hair);
  } else if (p.hairStyle === 2) {
    px(ctx, cx - 14, headTop + 6, 4, 34, p.hair);
    px(ctx, cx + 10, headTop + 6, 4, 34, p.hair);
    px(ctx, cx - 14, headTop + 38, 4, 2, p.hairShade);
    px(ctx, cx + 10, headTop + 38, 4, 2, p.hairShade);
  } else if (p.hairStyle === 3) {
    px(ctx, cx - 5, headTop - 6, 10, 8, p.hair);
    px(ctx, cx - 3, headTop - 8, 6, 2, p.hairShade);
  }

  // ── lighting: warm rim from the desk lamp, cool fill from the row ──
  px(ctx, cx + 9, headTop + 4, 1, 20, "#c98a25");
  px(ctx, cx + 7, headTop + 1, 3, 2, "#e0a63a");
  px(ctx, cx + 16, baseY - 42 + b, 1, 34, "#a8701c");
  px(ctx, cx + 22, baseY - 38 + b, 1, 26, "#8a5c17");
  px(ctx, cx - 10, headTop + 5, 1, 18, "#3c4a72");
  px(ctx, cx - 17, baseY - 42 + b, 1, 32, "#2c3a5e");
}

/**
 * The HR interviewer seen from the applicant's chair — the reverse of the shot
 * the room uses. Same rig and the same one-pixel detail density as everyone
 * else, scaled up because this is the only person in frame.
 */
export function drawHRFront(
  ctx: Ctx,
  cx: number,
  baseY: number,
  p: CandidatePalette,
  s: { breath: number; blinking: boolean; speaking: boolean },
) {
  const b = s.breath;
  const headTop = baseY - 78;

  // chair, just visible past the shoulders
  px(ctx, cx - 34, baseY - 40, 68, 40, "#3a3450");
  px(ctx, cx - 34, baseY - 40, 68, 2, "#4c4668");
  px(ctx, cx - 36, baseY - 34, 2, 34, "#2c2740");
  px(ctx, cx + 34, baseY - 34, 2, 34, "#2c2740");

  // torso
  px(ctx, cx - 26, baseY - 42 + b, 52, 42, p.outfitShade);
  px(ctx, cx - 24, baseY - 40 + b, 48, 40, p.outfit);
  px(ctx, cx - 30, baseY - 36 + b, 6, 36, p.outfitShade); // arms
  px(ctx, cx + 24, baseY - 36 + b, 6, 36, p.outfitShade);
  px(ctx, cx - 22, baseY - 40 + b, 44, 2, "#ffffff11");

  // shirt and collar
  px(ctx, cx - 9, baseY - 44 + b, 18, 20, "#e6e9f2");
  px(ctx, cx - 13, baseY - 45 + b, 8, 9, "#dfe3ee");
  px(ctx, cx + 5, baseY - 45 + b, 8, 9, "#dfe3ee");
  px(ctx, cx - 3, baseY - 40 + b, 6, 18, p.accent); // tie
  px(ctx, cx - 4, baseY - 42 + b, 8, 3, p.accent);

  // neck
  px(ctx, cx - 7, baseY - 50, 14, 8, p.skinShade);

  // head
  px(ctx, cx - 15, headTop, 30, 32, p.skin);
  px(ctx, cx - 15, headTop, 30, 4, p.skinShade);
  px(ctx, cx - 17, headTop + 12, 2, 7, p.skinShade); // ears
  px(ctx, cx + 15, headTop + 12, 2, 7, p.skinShade);
  px(ctx, cx - 15, headTop + 28, 30, 4, p.skinShade); // jaw

  // hair
  px(ctx, cx - 16, headTop - 4, 32, 8, p.hair);
  px(ctx, cx - 14, headTop - 6, 28, 3, p.hairShade);
  px(ctx, cx - 18, headTop + 2, 3, 14, p.hair);
  px(ctx, cx + 15, headTop + 2, 3, 14, p.hair);
  px(ctx, cx - 15, headTop + 3, 30, 2, p.hairShade);

  // face
  if (s.blinking) {
    px(ctx, cx - 10, headTop + 15, 6, 1, p.skinShade);
    px(ctx, cx + 4, headTop + 15, 6, 1, p.skinShade);
  } else {
    px(ctx, cx - 10, headTop + 13, 6, 4, "#f4f6fb");
    px(ctx, cx + 4, headTop + 13, 6, 4, "#f4f6fb");
    px(ctx, cx - 8, headTop + 14, 2, 3, "#1a1f2e");
    px(ctx, cx + 6, headTop + 14, 2, 3, "#1a1f2e");
  }
  px(ctx, cx - 11, headTop + 11, 7, 1, p.hairShade); // brows
  px(ctx, cx + 4, headTop + 11, 7, 1, p.hairShade);
  px(ctx, cx - 2, headTop + 18, 4, 4, p.skinShade); // nose
  if (s.speaking) {
    px(ctx, cx - 4, headTop + 24, 8, 3, "#4a2b2b");
    px(ctx, cx - 3, headTop + 25, 6, 1, "#7a4a4a");
  } else {
    px(ctx, cx - 4, headTop + 25, 8, 1, p.skinShade);
  }

  if (p.glasses) {
    const rim = "#39405c";
    px(ctx, cx - 12, headTop + 11, 9, 1, rim);
    px(ctx, cx - 12, headTop + 18, 9, 1, rim);
    px(ctx, cx - 12, headTop + 11, 1, 8, rim);
    px(ctx, cx - 4, headTop + 11, 1, 8, rim);
    px(ctx, cx + 3, headTop + 11, 9, 1, rim);
    px(ctx, cx + 3, headTop + 18, 9, 1, rim);
    px(ctx, cx + 3, headTop + 11, 1, 8, rim);
    px(ctx, cx + 11, headTop + 11, 1, 8, rim);
    px(ctx, cx - 4, headTop + 14, 7, 1, rim); // bridge
  }
}
