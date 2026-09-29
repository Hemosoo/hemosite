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
  else anchors.delete(id);
}

export interface AnchorRect {
  /** Centre of the word, in viewport coordinates. */
  cx: number;
  cy: number;
  width: number;
  height: number;
}

/** Read at most once per frame by the flight; null while About is unmounted. */
export function anchorRect(id: string): AnchorRect | null {
  const el = anchors.get(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, width: r.width, height: r.height };
}
