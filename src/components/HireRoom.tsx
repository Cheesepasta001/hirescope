"use client";

import { useEffect, useRef, useState } from "react";
import { drawHireScene, SEATS, seatFractions, type SeatOccupant } from "@/lib/scene/hireRoom";
import { SCENE_H, SCENE_W } from "@/lib/scene/palette";

/**
 * The hiring room above the search box.
 *
 * The chairs hold the current top matches, so the scene is a reading of the
 * result rather than decoration next to it: five people means five matches,
 * and three empty chairs means the query found three. Scores sit under the
 * chairs so the row reads left to right as a ranking.
 */
export function HireRoom({
  occupants,
  searching,
  label,
}: {
  occupants: SeatOccupant[];
  searching: boolean;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // The scene is redrawn from a ref rather than from state, so a query landing
  // mid-frame does not tear the animation.
  const stateRef = useRef({ occupants, searching });
  stateRef.current = { occupants: occupants.slice(0, SEATS), searching };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    const paint = (t: number) => {
      drawHireScene(ctx, {
        timeMs: t,
        reducedMotion,
        occupants: stateRef.current.occupants,
        searching: stateRef.current.searching,
      });
      if (!reducedMotion) raf = requestAnimationFrame(paint);
    };

    if (reducedMotion) paint(0);
    else raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  // With reduced motion the scene is static, so it has to repaint when the
  // results change or the room would keep showing the previous search.
  useEffect(() => {
    if (!reducedMotion) return;
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    drawHireScene(ctx, {
      timeMs: 0,
      reducedMotion: true,
      occupants: stateRef.current.occupants,
      searching: stateRef.current.searching,
    });
  }, [occupants, searching, reducedMotion]);

  const seats = seatFractions();

  return (
    <div>
      <div className="scanlines pixel-frame relative">
        <canvas
          ref={ref}
          width={SCENE_W}
          height={SCENE_H}
          className="pixel"
          role="img"
          aria-label={label}
        />
      </div>

      {/* Names and scores sit under the canvas rather than inside it. The
          sprite font has five glyphs and exists to write VACANT; real text in
          the DOM can be Korean, can be selected, and is read by a screen
          reader. Each label is positioned on its seat's centre. */}
      <div className="relative mt-2 h-9" aria-hidden={occupants.length === 0}>
        {seats.map((frac, i) => {
          const person = occupants[i];
          if (!person) return null;
          return (
            <div
              key={`${person.name}-${i}`}
              className="absolute -translate-x-1/2 text-center leading-tight"
              style={{ left: `${frac * 100}%` }}
            >
              <div
                className={`ui text-[13px] truncate max-w-[7.5rem] ${
                  person.top ? "text-[var(--accent)]" : "text-[var(--ink-dim)]"
                }`}
                title={person.name}
              >
                {person.name}
              </div>
              <div className="ui tabnum text-[12px] text-[var(--ink-faint)]">
                {person.score}
                <span className="ml-1 text-[10px] opacity-70">match</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
