import { CARD_W, CARD_H, INK } from "./cardTheme";

/**
 * Card back: the reference's blueprint schematic, rebuilt as geometry.
 *
 * Corner-to-corner diagonals, nested diamonds around a central circle, nodes
 * where lines meet, and a chamfered inner frame with a tab at top and bottom.
 * The reference's micro-annotations are drawn as tick runs rather than real
 * text — at card size they read identically and stay crisp at any scale,
 * where actual text would either be unreadable or fight the layout.
 */

const M = 16; // outer margin
const CX = CARD_W / 2;
const CY = CARD_H / 2;

/** Frame with cut corners and a tab centred on the short edges. */
const frame = (() => {
  const c = 22; // chamfer
  const t = 34; // tab half-width
  const l = M;
  const r = CARD_W - M;
  const tp = M;
  const bt = CARD_H - M;
  return [
    `M${l + c} ${tp}`,
    `H${CX - t}`,
    `l6 -7 H${CX + t - 6} l6 7`,
    `H${r - c}`,
    `L${r} ${tp + c}`,
    `V${bt - c}`,
    `L${r - c} ${bt}`,
    `H${CX + t}`,
    `l-6 7 H${CX - t + 6} l-6 -7`,
    `H${l + c}`,
    `L${l} ${bt - c}`,
    `V${tp + c}`,
    "Z",
  ].join(" ");
})();

const diamond = (rx: number, ry: number) =>
  `M${CX} ${CY - ry} L${CX + rx} ${CY} L${CX} ${CY + ry} L${CX - rx} ${CY} Z`;

/** A run of short dashes standing in for a block of annotation text. */
function Annotation({
  x,
  y,
  lines,
  color,
  align = "left",
}: {
  x: number;
  y: number;
  lines: number[];
  color: string;
  align?: "left" | "right";
}) {
  return (
    <g stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.5">
      {lines.map((w, i) => (
        <line
          key={i}
          x1={align === "left" ? x : x - w}
          y1={y + i * 7}
          x2={align === "left" ? x + w : x}
          y2={y + i * 7}
        />
      ))}
    </g>
  );
}

export default function CardBack() {
  const nodes: Array<[number, number]> = [
    [CX, CY - 78],
    [CX, CY + 78],
    [CX - 56, CY],
    [CX + 56, CY],
    [CX - 40, CY - 56],
    [CX + 40, CY - 56],
    [CX - 40, CY + 56],
    [CX + 40, CY + 56],
  ];

  return (
    <g>
      <rect x="0" y="0" width={CARD_W} height={CARD_H} rx="22" fill={INK.back} />
      <g stroke={INK.backLine} fill="none" strokeLinejoin="round">
        {/* Diagonals corner to corner, the structure everything hangs off. */}
        <g strokeWidth="1.5" opacity="0.55">
          <line x1={M} y1={M} x2={CARD_W - M} y2={CARD_H - M} />
          <line x1={CARD_W - M} y1={M} x2={M} y2={CARD_H - M} />
        </g>

        {/* Nested diamonds. */}
        <g strokeWidth="1.6" opacity="0.75">
          <path d={diamond(78, 108)} />
          <path d={diamond(56, 78)} />
          <path d={diamond(30, 42)} />
        </g>
        <circle cx={CX} cy={CY} r="20" strokeWidth="1.6" opacity="0.8" />

        {/* Nodes where the lattice meets. */}
        <g strokeWidth="1.5" opacity="0.85">
          {nodes.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5.5" />
          ))}
        </g>

        {/* Inner frame. */}
        <path d={frame} strokeWidth="1.6" opacity="0.7" />
        <g strokeWidth="1.3" opacity="0.4">
          <line x1={M + 10} y1={M + 10} x2={M + 10} y2={CARD_H - M - 10} />
          <line x1={CARD_W - M - 10} y1={M + 10} x2={CARD_W - M - 10} y2={CARD_H - M - 10} />
        </g>

        {/* Corner registration marks. */}
        <g strokeWidth="1.5" opacity="0.65">
          <circle cx={M + 12} cy={M + 12} r="4" />
          <circle cx={CARD_W - M - 12} cy={M + 12} r="4" />
          <circle cx={M + 12} cy={CARD_H - M - 12} r="4" />
          <circle cx={CARD_W - M - 12} cy={CARD_H - M - 12} r="4" />
        </g>
      </g>

      {/* Annotation blocks, mirrored through the centre like the reference. */}
      <Annotation x={62} y={52} lines={[34, 22, 40, 18, 30, 24]} color={INK.backLine} />
      <Annotation
        x={CARD_W - 62}
        y={CARD_H - 96}
        lines={[34, 22, 40, 18, 30, 24]}
        color={INK.backLine}
        align="right"
      />
      <Annotation x={CARD_W - 62} y={56} lines={[30, 40, 22]} color={INK.backAccent} align="right" />
      <Annotation x={62} y={CARD_H - 84} lines={[30, 40, 22]} color={INK.backAccent} />

      <rect
        x="1"
        y="1"
        width={CARD_W - 2}
        height={CARD_H - 2}
        rx="21"
        fill="none"
        stroke={INK.backLine}
        strokeWidth="2"
        opacity="0.35"
      />
    </g>
  );
}
