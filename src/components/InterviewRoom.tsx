"use client";

import { useEffect, useRef, useState } from "react";
import { drawApplicantScene } from "@/lib/scene/applicantRoom";
import { SCENE_H, SCENE_W } from "@/lib/scene/palette";

/**
 * The view from the candidate's chair, ported from the DEMO repo.
 *
 * The scene is drawn into a 384x216 buffer and upscaled with
 * image-rendering: pixelated, so the pixels stay chunky at any width. Nothing
 * here reads application state directly — it takes three booleans and a name,
 * which is what made it portable in the first place.
 *
 * `speaking` is wired to the interviewer's thinking state, so the figure across
 * the desk animates exactly while the model is composing the next question.
 * That turns the app's one unavoidable wait into the moment it looks most alive.
 */
export function InterviewRoom({
  candidateName,
  started,
  speaking,
  label,
}: {
  candidateName: string;
  /** False before the first question lands, which dims the terminal. */
  started: boolean;
  speaking: boolean;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

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
      drawApplicantScene(ctx, {
        timeMs: t,
        reducedMotion,
        invited: started,
        speaking,
        applicantName: candidateName,
      });
      if (!reducedMotion) raf = requestAnimationFrame(paint);
    };

    // With reduced motion we paint one still frame and stop, rather than
    // dropping the scene entirely — the room is orientation, not decoration.
    if (reducedMotion) paint(0);
    else raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [candidateName, started, speaking, reducedMotion]);

  return (
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
  );
}
