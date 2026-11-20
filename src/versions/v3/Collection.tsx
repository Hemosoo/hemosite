/**
 * The collection, set by set.
 *
 * Each set arrives as a stack and is dealt out the first time it scrolls into
 * view: a short, once-only deal (the cards are readable throughout, and with
 * reduced motion they are simply laid out). On a wide screen a set is a row;
 * on a narrow one it is a hand you swipe through, one card at a time, with its
 * position shown and arrows for anyone not swiping.
 *
 * Every card is a button: it opens the inspect view, where the card turns
 * over to its full detail. Beside each set, its cards are listed by name, so
 * the page can be skimmed without opening anything.
 */
import { useEffect, useRef, useState } from "react";
import { CardFront } from "./CardFaces";
import { SETS, SET_VAR, type CardData, type SetData } from "./collection";

export interface OpenRequest {
  id: string;
  from: DOMRect | null;
  returnTo: HTMLElement | null;
}

function CardSet({ set, onOpen }: { set: SetData; onOpen: (r: OpenRequest) => void }) {
  const ref = useRef<HTMLElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const [dealt, setDealt] = useState(false);
  const [at, setAt] = useState(0);

  // Dealt once, as it comes into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setDealt(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setDealt(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Which card of the hand is in front (narrow screens).
  useEffect(() => {
    const hand = handRef.current;
    if (!hand) return;
    const onScroll = () => {
      const kids = [...hand.children] as HTMLElement[];
      const mid = hand.scrollLeft + hand.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      kids.forEach((k, i) => {
        const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setAt(best);
    };
    hand.addEventListener("scroll", onScroll, { passive: true });
    return () => hand.removeEventListener("scroll", onScroll);
  }, []);

  const go = (i: number) => {
    const hand = handRef.current;
    const kid = hand?.children[i] as HTMLElement | undefined;
    if (!hand || !kid) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    hand.scrollTo({ left: kid.offsetLeft - (hand.clientWidth - kid.offsetWidth) / 2, behavior: smooth ? "smooth" : "auto" });
  };

  const open = (c: CardData, e: React.MouseEvent<HTMLButtonElement>) => {
    const face = e.currentTarget.querySelector(".v3-card-inner");
    onOpen({ id: c.id, from: (face ?? e.currentTarget).getBoundingClientRect(), returnTo: e.currentTarget });
  };

  const count = set.cards.length;
  return (
    <section
      ref={ref}
      id={set.id}
      className={`v3-set${dealt ? " is-dealt" : ""}`}
      data-set={set.id}
      style={{ ["--c" as string]: SET_VAR[set.id] }}
      aria-labelledby={`${set.id}-h`}
    >
      <header className="v3-set-head">
        <h2 id={`${set.id}-h`}>
          {set.title} <span className="v3-set-n">{count === 1 ? "1 card" : `${count} cards`}</span>
        </h2>
        <p>{set.blurb}</p>
        <ul className="v3-set-index">
          {set.cards.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={(e) => {
                  const btn = ref.current?.querySelector<HTMLButtonElement>(`[data-card="${c.id}"]`);
                  const face = btn?.querySelector(".v3-card-inner");
                  onOpen({ id: c.id, from: face?.getBoundingClientRect() ?? null, returnTo: e.currentTarget });
                }}
              >
                <span>{c.title}</span>
                <span className="v3-set-index-l">{c.line}</span>
              </button>
            </li>
          ))}
        </ul>
      </header>

      <div ref={handRef} className={`v3-hand n${count}`}>
        {set.cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className="v3-card"
            data-card={c.id}
            data-set={c.set}
            data-progress={c.inProgress ? "" : undefined}
            style={{ ["--i" as string]: i }}
            aria-label={`${c.title}. ${c.line}. Open the card`}
            onClick={(e) => open(c, e)}
          >
            <span className="v3-card-inner">
              <CardFront card={c} />
            </span>
          </button>
        ))}
      </div>

      {count > 1 && (
        <div className="v3-hand-nav" aria-label={`${set.title}: card ${at + 1} of ${count}`}>
          <button type="button" onClick={() => go(Math.max(0, at - 1))} disabled={at === 0} aria-label="Previous card">
            ←
          </button>
          <span aria-hidden>
            {at + 1} / {count}
          </span>
          <button
            type="button"
            onClick={() => go(Math.min(count - 1, at + 1))}
            disabled={at === count - 1}
            aria-label="Next card"
          >
            →
          </button>
        </div>
      )}
    </section>
  );
}

export default function Collection({ onOpen }: { onOpen: (r: OpenRequest) => void }) {
  return (
    <div className="v3-collection" id="collection">
      {SETS.map((s) => (
        <CardSet key={s.id} set={s} onOpen={onOpen} />
      ))}
    </div>
  );
}
