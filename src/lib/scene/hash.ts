/**
 * Deterministic 32-bit hash — drives per-candidate sprite palettes.
 *
 * Ported from the DEMO repo's lib/id.ts, trimmed to the one function the scene
 * layer needs. It is a palette selector and nothing else: the same name always
 * draws the same person, which is the whole point.
 *
 * Note for anyone tempted to reuse it: FNV-1a is not a MAC and must never back
 * a session token or anything else security-bearing. See the review notes on
 * the DEMO repo's HR gate.
 */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
