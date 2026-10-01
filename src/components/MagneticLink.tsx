import { useReducedMotion } from "framer-motion";
import { useMagnetic } from "../hooks/useMagnetic";

/**
 * A word in the bio that is also a link.
 *
 * The same magnetism as the poker tell, because it is the same gesture and
 * should answer the same way — the word notices a cursor before it arrives,
 * leans toward it, and eases back when it goes. What it does not have is the
 * tell's suits: those are a hint that a word hides a game, and a link does not
 * hide anything.
 *
 * The anchor itself never moves, only the text inside it, so the hit area
 * stays where it looks like it is.
 */
export default function MagneticLink({
  href,
  className,
  label,
  children,
}: {
  href: string;
  className?: string;
  /** Says where it goes, since the word alone does not. */
  label: string;
  children: React.ReactNode;
}) {
  const reduced = !!useReducedMotion();
  const { box, word, line } = useMagnetic(reduced);

  return (
    <a
      ref={box as React.RefObject<HTMLAnchorElement>}
      href={href}
      target="_blank"
      rel="noreferrer"
      // Inline so it reads as part of the sentence, not an element in it.
      className={`relative inline-block cursor-pointer outline-none ${className ?? ""}`}
      aria-label={label}
    >
      {/* A little more to aim at than the word itself. */}
      <span aria-hidden className="absolute -inset-2" />

      <span
        ref={word as React.RefObject<HTMLSpanElement>}
        className="relative inline-block will-change-transform"
      >
        {children}
        {/* Underline sweeps in from the left rather than just appearing. */}
        <span
          ref={line as React.RefObject<HTMLSpanElement>}
          aria-hidden
          className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-current"
          style={{ transform: "scaleX(0)", opacity: 0 }}
        />
      </span>
    </a>
  );
}
