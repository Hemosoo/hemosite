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

/** Longitudinal crease the wing folds on, as a distance from the centre line. */
export const WING_X = n * 0.46;

export type P2 = [number, number];

/**
 * Nose creases, per half (written for the left, mirrored by sign).
 *
 *   c1: (0, H/2) -> (-n, H/2 - n)          a 45 deg corner fold
 *   c2: (0, H/2) -> (-n, H/2 - 2n)         a steeper fold that narrows the nose
 *
 * Reflecting the corner (-n, H/2) across c1 lands it at (0, H/2 - n) — exactly
 * on the centre line, which is the defining property of the classic dart's
 * first fold. Derivation: for a crease through the origin with unit direction
 * d, a point v reflects to 2(v·d)d - v. With v = (-n, 0) and
 * d = (-1,-1)/sqrt(2): v·d = n/sqrt(2), so 2(v·d)d = (-n, -n) and the image is
 * (0, -n) relative to the apex.
 */
const APEX: P2 = [0, H / 2];
const C1_END: P2 = [-n, H / 2 - n];
const C2_END: P2 = [-n, H / 2 - 2 * n];

/** Where the c2 crease crosses the wing crease, so body pieces meet it exactly. */
const C2_AT_WING: P2 = [-WING_X, H / 2 - 2 * WING_X];

export interface Region {
  id: string;
  /** Polygon in card space, counter-clockwise. */
  points: P2[];
}

/** The four regions of one half. Mirrored with sign = -1 (left) / +1 (right). */
export function halfRegions(sign: number): Region[] {
  // Written for the left half; flipping x mirrors it to the right.
  const flip = (p: P2): P2 => [sign < 0 ? p[0] : -p[0], p[1]];
  const poly = (...pts: P2[]): P2[] => pts.map(flip);
  const tag = sign < 0 ? "L" : "R";
  return [
    { id: `nose1${tag}`, points: poly(APEX, [-n, H / 2], C1_END) },
    { id: `nose2${tag}`, points: poly(APEX, C1_END, C2_END) },
    {
      // Body inboard of the wing crease: bounded above by the c2 crease.
      id: `inner${tag}`,
      points: poly(APEX, C2_AT_WING, [-WING_X, -H / 2], [0, -H / 2]),
    },
    {
      id: `wing${tag}`,
      points: poly(C2_AT_WING, C2_END, [-n, -H / 2], [-WING_X, -H / 2]),
    },
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
    wing: { point: flip([-WING_X, 0]) as P2, angle: Math.PI / 2 } as Crease,
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
