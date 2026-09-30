/**
 * Where the highlighted words in the bio are, so the cards can land on them.
 *
 * The about copy already calls out Penn, Amazon, acapella, poker and dunking
 * in their own colours. Rather than build a second list of the same five
 * things, the cards fly into the sentence that was always there — which means
 * the flight needs live positions for words that are still scrolling.
 *
 * A registry rather than prop drilling: About owns the words, the scene owns
 * the cards, and neither has to know about the other's tree.
 */
const anchors = new Map<string, HTMLElement>();

export function registerAnchor(id: string, el: HTMLElement | null) {
  if (el) anchors.set(id, el);
  else {
    anchors.delete(id);
    styles.delete(id);
  }
}

export interface AnchorRect {
  /** Centre of the word, in viewport coordinates. */
  cx: number;
  cy: number;
  width: number;
  height: number;
  /**
   * How the word is actually set, so a card that is turning into one can
   * arrive already looking like it. Read from the live element rather than
   * written down twice, or the handover shows as a jump in size or colour
   * the first time anyone changes the bio's type.
   */
  fontSize: number;
  color: string;
  fontWeight: string;
}

/**
 * Hides a word until its card has finished becoming it.
 *
 * The card does not fly to the word any more, it turns into one — so for the
 * length of the flight there are two of every word, the one arriving and the
 * one already set in the sentence, drifting apart and then converging. Held
 * back, the bio genuinely is built by the hand: each word appears at the
 * moment its card delivers it, and the swap is invisible because by then the
 * two are the same word in the same place at the same size.
 *
 * `visibility` rather than `display`, so the word keeps its place in the line
 * and the flight can still measure where it is going.
 */
export function setAnchorVisible(id: string, visible: boolean) {
  const el = anchors.get(id);
  if (!el) return;
  const want = visible ? "" : "hidden";
  if (el.style.visibility !== want) el.style.visibility = want;
}

/** Everything back, for when the section is left by any route at all. */
export function showAllAnchors() {
  anchors.forEach((el) => {
    if (el.style.visibility) el.style.visibility = "";
  });
}

interface Styling {
  fontSize: number;
  color: string;
  fontWeight: string;
}

/**
 * Type is read once and kept. getComputedStyle is a layout read, and the
 * flight asks for five of these on every frame it runs.
 */
const styles = new Map<string, Styling>();

function read(id: string, el: HTMLElement): Styling {
  const cs = getComputedStyle(el);
  const out = {
    fontSize: parseFloat(cs.fontSize) || 16,
    color: cs.color,
    fontWeight: cs.fontWeight,
  };
  styles.set(id, out);
  return out;
}

/** Read at most once per frame by the flight; null while About is unmounted. */
export function anchorRect(id: string): AnchorRect | null {
  const el = anchors.get(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  const cs = styles.get(id) ?? read(id, el);
  return {
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    width: r.width,
    height: r.height,
    ...cs,
  };
}
