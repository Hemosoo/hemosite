/**
 * Cutting the card into shards.
 *
 * A warped grid: unevenly spaced rows and columns, every interior vertex
 * pushed off its lattice point, and a deterministic share of the cells split
 * along a diagonal. Cells share their vertices, so the pieces tile the card
 * exactly — there is no gap to show through and no overlap to double-darken.
 *
 * Border vertices slide along their edge and the four corners are pinned, so
 * the outline the shards reconstruct is the card's own rectangle. The rounded
 * corners come from the artwork inside, not from the cut.
 *
 * Pure geometry: no React, no DOM, computed once per reveal.
 */
import { CARD_H, CARD_W } from "./cardTheme";

export interface Shard {
  id: number;
  /** Polygon in card coordinates. */
  points: Array<[number, number]>;
  /** Centroid: the point it spins and scales about. */
  cx: number;
  cy: number;
  /** Share of the card's area, 0..1. Bigger pieces are given more weight. */
  weight: number;
}

/** Deterministic noise, so one reveal always cuts the same card the same way. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Uneven on purpose: equal cells read as a grid rather than as a break.
 * Twenty cells, a little under half of them split, lands around 28 pieces —
 * enough that the card genuinely builds, few enough to stay cheap to draw.
 */
const FINE_COLS = [0, 0.21, 0.47, 0.72, 1];
const FINE_ROWS = [0, 0.17, 0.38, 0.6, 0.8, 1];

/**
 * A coarser cut, for when three cards crystallise at once.
 *
 * The cost of this effect is the pieces still in the air, each of which is the
 * whole card drawn again through its own clip. One card at 28 pieces runs at
 * sixty frames a second; three at 28 measured at thirty. Twelve cells lands
 * around seventeen pieces, which is three cards for rather less than two — and
 * bigger fragments are the right call for the flop anyway, because they are
 * read from further away and for less time.
 */
const COARSE_COLS = [0, 0.34, 0.68, 1];
const COARSE_ROWS = [0, 0.27, 0.54, 0.79, 1];

export type Grain = "fine" | "coarse";

/** How far an interior vertex may wander, as a share of the smaller cell. */
const JITTER = 0.3;

function area(points: Array<[number, number]>) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function centroid(points: Array<[number, number]>): [number, number] {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  a *= 0.5;
  // A degenerate cell cannot happen with this jitter, but never divide by zero.
  if (Math.abs(a) < 1e-6) {
    const n = points.length;
    return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (6 * a), cy / (6 * a)];
}

export function cardShards(seed: number, grain: Grain = "fine"): Shard[] {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const COLS = grain === "coarse" ? COARSE_COLS : FINE_COLS;
  const ROWS = grain === "coarse" ? COARSE_ROWS : FINE_ROWS;

  // The lattice, warped. Border points may slide along their own edge so the
  // cut meets the card's edge at irregular places; corners stay put.
  const grid: Array<Array<[number, number]>> = [];
  for (let r = 0; r < ROWS.length; r++) {
    const row: Array<[number, number]> = [];
    for (let c = 0; c < COLS.length; c++) {
      const onLeft = c === 0;
      const onRight = c === COLS.length - 1;
      const onTop = r === 0;
      const onBottom = r === ROWS.length - 1;

      const cellW = (COLS[Math.min(c + 1, COLS.length - 1)] - COLS[Math.max(c - 1, 0)]) / 2;
      const cellH = (ROWS[Math.min(r + 1, ROWS.length - 1)] - ROWS[Math.max(r - 1, 0)]) / 2;

      let x = COLS[c];
      let y = ROWS[r];
      if (!onLeft && !onRight) x += (rnd() - 0.5) * 2 * JITTER * cellW;
      if (!onTop && !onBottom) y += (rnd() - 0.5) * 2 * JITTER * cellH;
      row.push([x * CARD_W, y * CARD_H]);
    }
    grid.push(row);
  }

  const shards: Shard[] = [];
  const total = CARD_W * CARD_H;
  const push = (points: Array<[number, number]>) => {
    const [cx, cy] = centroid(points);
    shards.push({ id: shards.length, points, cx, cy, weight: area(points) / total });
  };

  for (let r = 0; r < ROWS.length - 1; r++) {
    for (let c = 0; c < COLS.length - 1; c++) {
      const tl = grid[r][c];
      const tr = grid[r][c + 1];
      const br = grid[r + 1][c + 1];
      const bl = grid[r + 1][c];
      // Roughly two cells in five break into a pair of triangles, which is
      // what keeps the set from reading as two dozen quadrilaterals.
      if (rnd() < 0.42) {
        if (rnd() < 0.5) {
          push([tl, tr, br]);
          push([tl, br, bl]);
        } else {
          push([tl, tr, bl]);
          push([tr, br, bl]);
        }
      } else {
        push([tl, tr, br, bl]);
      }
    }
  }
  return shards;
}

/** An SVG points attribute for a shard. */
export const shardPoints = (s: Shard) =>
  s.points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
