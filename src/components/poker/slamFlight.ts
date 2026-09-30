/**
 * The slam, readable at any point rather than played on a clock.
 *
 * The game hands a SlamSpec's keyframe arrays to framer-motion, which owns
 * the timing. A scrolling page has no clock to own it — progress is wherever
 * the scrollbar is — so the same arrays are read directly here. The numbers
 * are the game's: hang, turn over, fall, squash, recover.
 */
import type { SlamSpec } from "../../poker/reveals";
import { cubicBezier, easeInOutSine, sampleTrack } from "./motion";

/** The fall is the fast part: the same curve the game gives the outer track. */
const FALL = cubicBezier(0.5, 0, 0.75, 1);

export interface SlamFrame {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  /** 180 face down, 0 face up. */
  flip: number;
}

export function slamFrame(spec: SlamSpec, t: number): SlamFrame {
  const o = spec.outer;
  return {
    x: sampleTrack(o.times, o.x, t, FALL),
    y: sampleTrack(o.times, o.y, t, FALL),
    scale: sampleTrack(o.times, o.scale, t, FALL),
    rotate: sampleTrack(o.times, o.rotate, t, FALL),
    flip: sampleTrack(spec.flip.times, spec.flip.rotateY, t, easeInOutSine),
  };
}
