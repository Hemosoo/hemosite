import * as THREE from "three";

/**
 * Card geometry and the crease system it folds on.
 *
 * The card is a W x H rectangle in its own XY plane, nose toward +Y, front
 * toward +Z. It is partitioned into polygons that tile that rectangle exactly:
 * every crease is a shared edge, so in the flat state the seams are invisible
 * and the card reads as one surface.
 *
 * Coordinates below are "card space". Every polygon's UVs are derived from
 * card space, not from the polygon's own bounds, which is what keeps the
 * printed face continuous while the pieces rotate away from each other.
 */

/** Real playing cards are 2.5 x 3.5 inches. */
export const W = 2.5;
export const H = 3.5;
const n = W / 2;

/**
 * Half-width of the fuselage at the tail. The wing crease runs from the nose
 * back to this point, so the body is a thin wedge and each wing spans
 * (n - FUSELAGE_HALF) = 37% of the card's full width — the wings dominate,
 * which is what makes the silhouette read as a dart rather than a folded
 * rectangle.
 */
export const FUSELAGE_HALF = 0.32;

export type P2 = [number, number];

/**
 * Creases, written for the left half and mirrored by sign.
 *
 *   c1    apex -> (-n, H/2 - n)              45 deg; corner to the centre line
 *   c2    apex -> (-n, H/2 - (1+sqrt2)n)     the angled edge to the centre line
 *   wing  apex -> (-FUSELAGE_HALF, -H/2)     splits thin body from broad wing
 *
 * c1: reflecting the corner (-n, 0) about unit d = (-1,-1)/sqrt2 gives
 * 2(v·d)d - v = (-n,-n) - (-n,0) = (0,-n): exactly on the centre line.
 *
 * c2 bisects the angle between the new 45 deg edge and the centre line, so the
 * edge folds flat onto the centre. Bisecting 225 deg and 270 deg gives 247.5
 * deg, and that ray leaves the card's side at y = H/2 - (1+sqrt2)n — the
 * (1+sqrt2) falls out of cot(22.5 deg). Folding to the centre twice is what
 * produces a long sharp nose instead of a blunt 90 deg point.
 */
const APEX: P2 = [0, H / 2];
const C1_END: P2 = [-n, H / 2 - n];
const C2_END: P2 = [-n, H / 2 - (1 + Math.SQRT2) * n];
const WING_END: P2 = [-FUSELAGE_HALF, -H / 2];

export interface Region {
  id: string;
  /** Polygon in card space. */
  points: P2[];
  /** Layer lift, to keep folded-flat pieces from z-fighting. */
  lift: number;
}

/**
 * Four regions per half, tiling it exactly.
 *
 * Nesting matters as much as the shapes: nose1 lives inside nose2, both inside
 * the wing, all inside the half. So when the wing swings out it carries the
 * folded nose layers with it, exactly as the paper would.
 */
export function halfRegions(sign: number): Region[] {
  const flip = (p: P2): P2 => [sign < 0 ? p[0] : -p[0], p[1]];
  const poly = (...pts: P2[]): P2[] => pts.map(flip);
  const tag = sign < 0 ? "L" : "R";
  return [
    { id: `nose1${tag}`, points: poly(APEX, [-n, H / 2], C1_END), lift: 0.014 },
    { id: `nose2${tag}`, points: poly(APEX, C1_END, C2_END), lift: 0.007 },
    {
      // The wing: apex to the tail corner, the largest piece on the card.
      id: `wing${tag}`,
      points: poly(APEX, C2_END, [-n, -H / 2], WING_END),
      lift: 0,
    },
    { id: `fuselage${tag}`, points: poly(APEX, WING_END, [0, -H / 2]), lift: 0 },
  ];
}

/** A crease: a point on the line plus the line's angle in card space. */
export interface Crease {
  point: P2;
  angle: number;
}

const angleOf = (a: P2, b: P2) => Math.atan2(b[1] - a[1], b[0] - a[0]);

export function creases(sign: number) {
  const flip = (p: P2): P2 => [sign < 0 ? p[0] : -p[0], p[1]];
  const a = flip(APEX);
  return {
    nose1: { point: a, angle: angleOf(a, flip(C1_END)) } as Crease,
    nose2: { point: a, angle: angleOf(a, flip(C2_END)) } as Crease,
    /** Centre crease: vertical, so the pivot's local X runs along +Y. */
    centre: { point: [0, 0] as P2, angle: Math.PI / 2 } as Crease,
    /** Swept, from the nose to the tail — this is what makes a wing, not a strip. */
    wing: { point: a, angle: angleOf(a, flip(WING_END)) } as Crease,
  };
}

/**
 * Where a mesh must sit inside its pivot so that it lands back in card space.
 *
 * The pivot is T(p)·R(theta); to cancel it the child carries R(-theta)·T(-p).
 * As a TRS that is rotation -theta and position R(-theta)·(-p).
 */
export function childOffset(crease: Crease): { pos: [number, number, number]; rotZ: number } {
  const [px, py] = crease.point;
  const c = Math.cos(crease.angle);
  const s = Math.sin(crease.angle);
  return {
    pos: [-px * c - py * s, px * s - py * c, 0],
    rotZ: -crease.angle,
  };
}

/**
 * Triangulate a convex polygon as a fan and emit card-space UVs.
 *
 * `lift` nudges the piece along +Z by a hair. Folded layers end up coplanar at
 * exactly 180 degrees, so without a per-layer offset they z-fight; the folds
 * also stop slightly short of 180 for the same reason.
 */
export function polygonGeometry(points: P2[], lift = 0): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const nrm: number[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    for (const p of [points[0], points[i], points[i + 1]]) {
      pos.push(p[0], p[1], lift);
      uv.push((p[0] + W / 2) / W, (p[1] + H / 2) / H);
      nrm.push(0, 0, 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.computeBoundingSphere();
  return g;
}
