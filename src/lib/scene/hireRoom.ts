import { ROOM, SCENE_H, SCENE_W, WOOD, candidatePalette, type CandidatePalette } from "./palette";
import {
  drawCandidate,
  drawEmptyChair,
  drawHRBack,
  px,
  type Ctx,
} from "./sprites";

/**
 * The hiring room, seen over the shoulder of the person doing the hiring.
 *
 * Search results are the people in the chairs. Ask for a PyTorch engineer and
 * the ones who can actually evidence it are the ones sitting there; the rest of
 * the row stays empty rather than being padded out with near-misses, because an
 * empty chair is the honest picture of a thin result.
 *
 * This is a new scene rather than a port of DEMO's room.ts. That file is 687
 * lines of queue choreography — candidates arriving, changing seats, leaving —
 * built for a screening run that processes a batch. Search is not a batch; it
 * is a question with an answer that changes as you type. The sprites and the
 * palette are DEMO's; the staging is this app's.
 */

export const SEATS = 5;

/**
 * The hiring manager is cast deliberately rather than hashed from a name. The
 * generator picked a brass outfit, which in this palette is the same family as
 * the lamp light, and the foreground figure stopped reading as a person.
 */
const HIRING_MANAGER: CandidatePalette = {
  skin: "#e0a878",
  skinShade: "#b57d4f",
  hair: "#2f2a33",
  hairShade: "#1d1a22",
  outfit: "#2f3856",
  outfitShade: "#222941",
  accent: "#8fa3cc",
  hairStyle: 0,
  glasses: false,
  collar: 1,
};

/** Seat centres as a fraction of scene width, so DOM labels can line up. */
export function seatFractions(): number[] {
  return Array.from({ length: SEATS }, (_, i) => seatX(i) / SCENE_W);
}

export type SeatOccupant = {
  name: string;
  /** 0-100 overall. Drawn under the chair so the row reads as a ranking. */
  score: number;
  /** The top match gets the lamp. */
  top: boolean;
};

export type HireSceneState = {
  timeMs: number;
  reducedMotion: boolean;
  /** Empty before a search has been run. */
  occupants: SeatOccupant[];
  /** True while the query is in flight — the terminal works, the chairs wait. */
  searching: boolean;
};

const FLOOR_Y = 150;
const SEAT_BASE = 136;
const HR_BASE = SCENE_H + 12; // mostly off-frame; enough head and shoulder to read as a person

/** Interior. Kept flatter than the applicant room: this is the side of the desk
 *  where the work happens, not the side being judged. */
function drawRoom(ctx: Ctx, t: number, reduced: boolean) {
  px(ctx, 0, 0, SCENE_W, FLOOR_Y, ROOM.wall);
  px(ctx, 0, 0, SCENE_W, 26, ROOM.ceiling);
  px(ctx, 0, 26, SCENE_W, 3, ROOM.wallTrim);

  // Panelled wall, so the flat colour has something to sit on.
  for (let x = 0; x < SCENE_W; x += 48) {
    px(ctx, x, 29, 2, FLOOR_Y - 29, ROOM.wallDark);
    px(ctx, x + 2, 29, 44, 2, ROOM.wallLight);
  }

  px(ctx, 0, FLOOR_Y, SCENE_W, SCENE_H - FLOOR_Y, ROOM.floor);
  px(ctx, 0, FLOOR_Y, SCENE_W, 2, ROOM.floorDark);
  px(ctx, 42, FLOOR_Y + 6, SCENE_W - 84, 30, ROOM.rug);
  px(ctx, 42, FLOOR_Y + 6, SCENE_W - 84, 2, ROOM.rugTrim);

  // Window, left. The light it throws is what makes the room read as morning.
  px(ctx, 22, 44, 74, 52, ROOM.wallTrim);
  px(ctx, 24, 46, 70, 48, ROOM.coolDeep);
  px(ctx, 24, 46, 70, 24, ROOM.cool);
  px(ctx, 24, 46, 70, 10, ROOM.coolPale);
  px(ctx, 57, 46, 2, 48, ROOM.wallTrim);
  px(ctx, 24, 68, 70, 2, ROOM.wallTrim);

  // Sun wedge across the floor, drifting unless motion is reduced.
  const drift = reduced ? 0 : Math.round(Math.sin(t / 5200) * 6);
  ctx.globalAlpha = 0.16;
  px(ctx, 30 + drift, 96, 96, FLOOR_Y - 96, ROOM.coolPale);
  px(ctx, 44 + drift, FLOOR_Y, 110, 26, ROOM.coolPale);
  ctx.globalAlpha = 1;
}

/** The board behind the chairs. Blinks while a query is running. */
function drawTerminal(ctx: Ctx, t: number, searching: boolean, reduced: boolean) {
  const x = 268;
  const y = 40;
  px(ctx, x - 2, y - 2, 96, 56, ROOM.brassDeep);
  px(ctx, x, y, 92, 52, "#141a30");

  const rows = 5;
  for (let i = 0; i < rows; i++) {
    const on = searching && !reduced ? (Math.floor(t / 140) + i) % 3 !== 0 : true;
    const w = [58, 44, 66, 38, 52][i];
    px(ctx, x + 7, y + 8 + i * 9, w, 3, on ? ROOM.brass : ROOM.brassDeep);
  }

  // A caret that only exists while the query is in flight.
  if (searching && (reduced || Math.floor(t / 420) % 2 === 0)) {
    px(ctx, x + 7, y + 8 + rows * 9, 5, 3, ROOM.brassPale);
  }
}

/** The desk edge in the foreground, between the viewer and the room. */
function drawDeskEdge(ctx: Ctx) {
  const y = SCENE_H - 30;
  px(ctx, 0, y, SCENE_W, 30, WOOD.face);
  px(ctx, 0, y, SCENE_W, 4, WOOD.top);
  px(ctx, 0, y + 4, SCENE_W, 2, WOOD.topLight);
  px(ctx, 0, SCENE_H - 3, SCENE_W, 3, WOOD.edge);
}

function seatX(i: number): number {
  const span = SCENE_W - 96;
  return 48 + Math.round((span / (SEATS - 1)) * i);
}

export function drawHireScene(ctx: Ctx, s: HireSceneState) {
  const t = s.reducedMotion ? 0 : s.timeMs;

  ctx.clearRect(0, 0, SCENE_W, SCENE_H);
  drawRoom(ctx, t, s.reducedMotion);
  drawTerminal(ctx, t, s.searching, s.reducedMotion);

  const breath = s.reducedMotion ? 0 : Math.floor((t / 1100) % 2);

  for (let i = 0; i < SEATS; i++) {
    const cx = seatX(i);
    const person = s.occupants[i];

    if (!person) {
      drawEmptyChair(ctx, cx, SEAT_BASE);
      continue;
    }

    const pal = candidatePalette(person.name);

    // Each candidate is offset in the blink and glance cycle by their own name,
    // so five people do not blink in unison like one animation played five times.
    const seed = (pal.hairStyle + i * 7) / 11;
    const blinkPhase = (t / 1000 + seed * 5.6) % 5.6;
    const glancePhase = Math.floor(t / 2600 + seed * 3) % 4;

    drawCandidate(ctx, cx - 16, SEAT_BASE - 32, pal, {
      breath,
      blinking: !s.reducedMotion && blinkPhase < 0.15,
      selected: person.top,
      glance: s.reducedMotion ? 0 : glancePhase === 1 ? -1 : glancePhase === 3 ? 1 : 0,
      lookUp: !s.reducedMotion && s.searching,
      fidget: s.reducedMotion ? 0 : Math.floor(t / 1700 + seed * 4) % 5 === 0 ? 1 : 0,
    });

    // The top match gets a strip of lamp light on the floor. Names and scores
    // are not drawn here: the canvas font has five glyphs (V, A, C, N, T),
    // because it exists to write VACANT. Real labels live in the DOM under the
    // canvas, which also means they can be Korean, selected, and read aloud.
    if (person.top) {
      ctx.globalAlpha = 0.22;
      px(ctx, cx - 14, SEAT_BASE + 2, 28, 4, ROOM.brassPale);
      ctx.globalAlpha = 1;
    }
  }

  // The person doing the hiring, back to us, filling the near edge.
  drawHRBack(ctx, SCENE_W / 2, HR_BASE, HIRING_MANAGER, breath);
  drawDeskEdge(ctx);
}
