import { hashString } from "./hash";

/** Scene buffer size. Everything is authored in these coordinates, then
 *  upscaled with image-rendering: pixelated, so pixels stay chunky. */
export const SCENE_W = 384;
export const SCENE_H = 216;

/** Fixed room palette — the dark tribunal set. */
/**
 * Morning. The room is lit by the window rather than by the desk lamp: walls
 * lift toward a warm grey-blue, the floor warms up, and the deep near-black of
 * the night version survives only in the shadows the light does not reach.
 */
export const ROOM = {
  wallDark: "#2a3149",
  wall: "#39415e",
  wallLight: "#454e70",
  wallTrim: "#232a40",
  ceiling: "#1b2136",
  floor: "#3a2f3e",
  floorDark: "#2b222f",
  rug: "#4a3348",
  rugTrim: "#5c4059",

  shadow: "#161b2b",

  brass: "#f2b544",
  brassMid: "#c98a25",
  brassDeep: "#8a5c17",
  brassPale: "#ffe9b8",

  cool: "#7f95c4",
  coolPale: "#c3d3f2",
  coolDeep: "#3c4a72",
} as const;

/** Wood tones for the two desks. */
export const WOOD = {
  top: "#7a5738",
  topLight: "#957048",
  face: "#5a3f28",
  edge: "#3a2718",
} as const;

export type CandidatePalette = {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  outfit: string;
  outfitShade: string;
  accent: string;
  hairStyle: 0 | 1 | 2 | 3;
  glasses: boolean;
  collar: 0 | 1 | 2;
};

const SKINS: Array<[string, string]> = [
  ["#f0c8a0", "#c99b74"],
  ["#e0a878", "#b57d4f"],
  ["#c98a5e", "#9c6440"],
  ["#8d5a3b", "#6b4029"],
  ["#5e3a26", "#43281a"],
  ["#f7dcc0", "#d4b190"],
];

const HAIRS: Array<[string, string]> = [
  ["#2a1c14", "#170e0a"],
  ["#4a3020", "#2c1b12"],
  ["#7a5230", "#4e321c"],
  ["#c9a227", "#8f7018"],
  ["#8a8f9c", "#5c616d"],
  ["#3c2a4a", "#241830"],
  ["#8c2f2f", "#5c1c1c"],
];

const OUTFITS: Array<[string, string]> = [
  ["#2f4b7c", "#1d3054"],
  ["#3c6e5a", "#254738"],
  ["#6b3a52", "#452334"],
  ["#4a4a58", "#2e2e38"],
  ["#5a4630", "#382a1c"],
  ["#2f5f6e", "#1c3c47"],
  ["#5c3030", "#3a1c1c"],
];

const ACCENTS = ["#f2b544", "#7f95c4", "#c25e5e", "#5fa887", "#b07fc4", "#d9d2c2"];

/**
 * Avalanche step. FNV's high bits are its weakest, and the palette used to read
 * hair style, glasses and collar from shifts 22/26/28 of a single hash — which
 * left one of the four hair silhouettes essentially unreachable and made a row
 * of candidates look like siblings. Mixing first, then drawing each trait from
 * its own derived value, gives every field an independent spread.
 */
function mix(h: number): number {
  let x = h >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

/**
 * Distinct look per candidate, same underlying rig — seeded by name so a
 * candidate always renders identically across sessions.
 */
export function candidatePalette(seedSource: string): CandidatePalette {
  let cursor = hashString(seedSource);
  /** Each call advances the stream, so no two traits share bits. */
  const next = (): number => {
    cursor = mix(cursor + 0x9e3779b9);
    return cursor;
  };
  const pick = <T,>(arr: T[]): T => arr[next() % arr.length];

  const [skin, skinShade] = pick(SKINS);
  const [hair, hairShade] = pick(HAIRS);
  const [outfit, outfitShade] = pick(OUTFITS);
  const accent = pick(ACCENTS);

  return {
    skin,
    skinShade,
    hair,
    hairShade,
    outfit,
    outfitShade,
    accent,
    hairStyle: (next() % 4) as 0 | 1 | 2 | 3,
    glasses: next() % 100 < 35,
    collar: (next() % 3) as 0 | 1 | 2,
  };
}
