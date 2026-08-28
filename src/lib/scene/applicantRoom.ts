import { ROOM, SCENE_H, SCENE_W, WOOD, candidatePalette } from "./palette";
import { drawHRFront, px, type Ctx } from "./sprites";

/**
 * The room from the applicant's chair — the reverse of the shot HR sees.
 *
 * Same room, same morning, same palette; the camera has just turned around. The
 * point of drawing it at all is that the applicant is not looking at a form.
 * They are sitting across a desk from somebody.
 */

export type ApplicantSceneState = {
  timeMs: number;
  reducedMotion: boolean;
  /** true once the panel has asked to interview — the interviewer looks up. */
  invited: boolean;
  /** true while a question is on the table. */
  speaking: boolean;
  applicantName: string;
};

const HR_PALETTE = {
  ...candidatePalette("hirescope-interviewer"),
  hair: "#3a2a20",
  hairShade: "#241811",
  outfit: "#3b4568",
  outfitShade: "#2a3350",
  accent: "#8a5c17",
  glasses: true,
};

const DESK_Y = 150;

function drawWall(ctx: Ctx) {
  px(ctx, 0, 0, SCENE_W, DESK_Y + 10, ROOM.wall);
  for (let x = 0; x < SCENE_W; x += 32) {
    px(ctx, x, 0, 1, DESK_Y, ROOM.wallDark);
    px(ctx, x + 1, 0, 1, DESK_Y, ROOM.wallLight);
  }
  px(ctx, 0, 0, SCENE_W, 12, ROOM.ceiling);
  px(ctx, 0, 11, SCENE_W, 1, ROOM.wallTrim);
  px(ctx, 0, 96, SCENE_W, 2, ROOM.wallTrim);
  px(ctx, 0, 98, SCENE_W, DESK_Y - 98, ROOM.wallDark);
}

function drawWindow(ctx: Ctx, t: number, reduced: boolean) {
  const x = 22;
  const y = 22;
  const w = 76;
  const h = 54;

  px(ctx, x - 3, y - 3, w + 6, h + 6, "#4a4256");
  px(ctx, x - 2, y - 2, w + 4, h + 4, "#5e5368");

  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#6f9ad4");
  g.addColorStop(0.4, "#a8c4e8");
  g.addColorStop(0.72, "#f0d2a8");
  g.addColorStop(1, "#f6b878");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  const sunX = x + 18;
  const sunY = y + h - 18;
  const halo = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 28);
  halo.addColorStop(0, "rgba(255,246,214,0.95)");
  halo.addColorStop(0.4, "rgba(255,228,168,0.45)");
  halo.addColorStop(1, "rgba(255,228,168,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(x, y, w, h);
  px(ctx, sunX - 3, sunY - 3, 6, 6, "#fffaf0");

  for (let i = 0; i < 8; i++) {
    const bh = 5 + ((i * 7) % 13);
    const bx = x + i * 10;
    px(ctx, bx, y + h - bh, 9, bh, "#8f7a92");
    px(ctx, bx, y + h - bh, 9, 1, "#c4a89f");
  }

  px(ctx, x + w / 2 - 1, y, 2, h, "#5e5368");
  px(ctx, x, y + h / 2 - 1, w, 2, "#5e5368");

  // light falling across the desk from the left
  if (!reduced) {
    const shaft = ctx.createLinearGradient(60, 24, 200, SCENE_H);
    shaft.addColorStop(0, "rgba(255,240,205,0.22)");
    shaft.addColorStop(1, "rgba(255,232,190,0)");
    ctx.fillStyle = shaft;
    ctx.beginPath();
    ctx.moveTo(24, 24);
    ctx.lineTo(98, 24);
    ctx.lineTo(230, SCENE_H);
    ctx.lineTo(70, SCENE_H);
    ctx.closePath();
    ctx.fill();
  }
}

/** The AI terminal, on the wall behind the interviewer. */
function drawTerminal(ctx: Ctx, t: number, active: boolean, reduced: boolean) {
  const x = 268;
  const y = 26;
  const w = 68;
  const h = 36;

  px(ctx, x - 4, y - 4, w + 8, h + 8, "#2a3150");
  px(ctx, x - 4, y - 4, w + 8, 2, "#3e4770");
  px(ctx, x - 2, y - 2, w + 4, h + 4, "#151a2c");
  px(ctx, x, y, w, h, "#2a1c08");

  const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(t / (active ? 200 : 1500));
  ctx.fillStyle = `rgba(242,181,68,${(0.18 * pulse).toFixed(3)})`;
  ctx.fillRect(x, y, w, h);

  for (let i = 0; i < 6; i++) {
    const seed = active && !reduced ? i + Math.floor(t / 160) : i;
    const lw = 8 + ((seed * 37) % (w - 16));
    px(ctx, x + 4, y + 4 + i * 5, lw, 2, i === 5 ? "#ffe9b8" : "#c98a25");
  }

  const glow = ctx.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, 70);
  glow.addColorStop(0, `rgba(242,181,68,${(0.16 * pulse).toFixed(3)})`);
  glow.addColorStop(1, "rgba(242,181,68,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 70, y - 40, w + 140, h + 90);
}

/** The desk, seen from the far side this time. */
function drawDesk(ctx: Ctx, applicantName: string) {
  px(ctx, 0, DESK_Y, SCENE_W, 6, WOOD.topLight);
  px(ctx, 0, DESK_Y + 6, SCENE_W, SCENE_H - DESK_Y - 6, WOOD.face);
  px(ctx, 0, DESK_Y + 6, SCENE_W, 2, WOOD.top);
  for (const x of [58, 150, 242, 334]) px(ctx, x, DESK_Y + 8, 2, SCENE_H - DESK_Y - 8, WOOD.edge);

  // the applicant's own file, open on the desk, facing away from them
  px(ctx, 30, DESK_Y - 14, 44, 16, "#e8e2d2");
  px(ctx, 30, DESK_Y - 14, 44, 2, "#f4f0e4");
  for (let i = 0; i < 4; i++) px(ctx, 34, DESK_Y - 10 + i * 3, 34 - (i % 2) * 8, 1, "#9a927f");
  px(ctx, 31, DESK_Y - 13, 10, 4, "#c25e5e");

  // a mug
  px(ctx, 300, DESK_Y - 14, 13, 13, "#cfd8ee");
  px(ctx, 300, DESK_Y - 14, 13, 3, "#eef2fb");
  px(ctx, 302, DESK_Y - 11, 9, 8, "#3a2418");
  px(ctx, 313, DESK_Y - 11, 3, 6, "#cfd8ee");

  // a nameplate facing the applicant
  px(ctx, 236, DESK_Y - 10, 46, 10, "#2a3150");
  px(ctx, 236, DESK_Y - 10, 46, 2, "#4c5580");
  px(ctx, 240, DESK_Y - 6, 38, 2, "#8fa2cc");
  void applicantName;
}

function drawFill(ctx: Ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, SCENE_H);
  g.addColorStop(0, "rgba(150,180,230,0.16)");
  g.addColorStop(0.5, "rgba(190,196,224,0.12)");
  g.addColorStop(1, "rgba(232,196,150,0.10)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);

  const side = ctx.createLinearGradient(0, 0, 200, 0);
  side.addColorStop(0, "rgba(255,238,200,0.14)");
  side.addColorStop(1, "rgba(255,238,200,0)");
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);

  const v = ctx.createRadialGradient(SCENE_W / 2, SCENE_H / 2, 80, SCENE_W / 2, SCENE_H / 2, 260);
  v.addColorStop(0, "rgba(14,16,28,0)");
  v.addColorStop(1, "rgba(14,16,28,0.40)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);

  px(ctx, 0, 0, SCENE_W, 1, ROOM.shadow);
  px(ctx, 0, SCENE_H - 1, SCENE_W, 1, ROOM.shadow);
  px(ctx, 0, 0, 1, SCENE_H, ROOM.shadow);
  px(ctx, SCENE_W - 1, 0, 1, SCENE_H, ROOM.shadow);
}

export function drawApplicantScene(ctx: Ctx, s: ApplicantSceneState) {
  const t = s.reducedMotion ? 0 : s.timeMs;

  ctx.clearRect(0, 0, SCENE_W, SCENE_H);
  drawWall(ctx);
  drawWindow(ctx, t, s.reducedMotion);
  drawTerminal(ctx, t, !s.invited, s.reducedMotion);

  const breath = s.reducedMotion ? 0 : Math.floor((t / 1100) % 2);
  const blinkPhase = (t / 1000) % 5.6;
  drawHRFront(ctx, 192, DESK_Y + 4, HR_PALETTE, {
    breath,
    blinking: !s.reducedMotion && blinkPhase < 0.15,
    speaking: s.speaking && !s.reducedMotion && Math.floor(t / 220) % 2 === 0,
  });

  drawDesk(ctx, s.applicantName);
  drawFill(ctx);
}
