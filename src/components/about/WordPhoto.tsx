/**
 * A highlighted word in the bio, tied to its photograph in the strip below.
 *
 * Pointing at the word lifts its card out of the spread; pointing at the card
 * underlines the word. One photograph per word, in one place — the strip —
 * rather than a second copy popping up in the margin.
 */
import { useLit } from "./lit";

export default function WordPhoto({
  id,
  className = "",
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { lit, setLit } = useLit();
  const on = lit === id;

  return (
    <span
      className={`${className} decoration-current/60 underline-offset-[6px] transition-[text-decoration-color] ${
        on ? "underline decoration-2" : ""
      }`}
      onPointerEnter={(e) => {
        // Touch has no hover, and a tap here should do what the word does
        // (a link, the poker table) without leaving a card stuck up.
        if (e.pointerType !== "touch") setLit(id);
      }}
      onPointerLeave={() => setLit(null)}
      onFocus={() => setLit(id)}
      onBlur={() => setLit(null)}
    >
      {children}
    </span>
  );
}
