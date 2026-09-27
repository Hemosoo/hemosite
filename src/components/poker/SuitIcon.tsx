import { SUIT_PATH, SUIT_COLOR, type Suit } from "./cardTheme";

/**
 * A suit, drawn as a path in its own 100x100 box.
 *
 * Kept as a plain <path> rather than a <use> so a single card can be rendered
 * standalone without needing a shared <defs> in the document.
 */
export default function SuitIcon({
  suit,
  size = 100,
  x = 0,
  y = 0,
  color,
  opacity = 1,
}: {
  suit: Suit;
  size?: number;
  x?: number;
  y?: number;
  color?: string;
  opacity?: number;
}) {
  const k = size / 100;
  return (
    <path
      d={SUIT_PATH[suit]}
      fill={color ?? SUIT_COLOR[suit]}
      opacity={opacity}
      transform={`translate(${x} ${y}) scale(${k})`}
    />
  );
}
