/**
 * Where the hero's card comes home to.
 *
 * Scrolling out of the hero, the paper plane flies back, unfolds along its
 * creases and lands exactly where the player card sits on the page, then the
 * DOM card fades in over its 3D double. The scene and the page don't share a
 * React tree in any useful way, so they meet here: the page registers its
 * card and layout, and the scene reads them each frame.
 *
 * If the scene never runs (a phone, no WebGL, reduced motion) nobody calls
 * `show`, and the card is simply there.
 */
export const landing = {
  /** The DOM card the plane lands on. */
  slot: null as HTMLElement | null,
  /** The element whose opacity hands over between the 3D card and the DOM one. */
  hold: null as HTMLElement | null,
  /** The section the card sits at the top of. */
  layout: null as HTMLElement | null,
  /** Scroll distance over which the landing plays: from the top of the page to
   *  where the card's column comes to rest under the bar. */
  runway: 1,
  /** Put the card face up, if it was flipped, before the 3D card takes over. */
  unflip: null as (() => void) | null,

  measure() {
    const hold = this.hold;
    const layout = this.layout;
    if (!hold || !layout) return;
    const stickTop = parseFloat(getComputedStyle(hold).top) || 76;
    const natural =
      layout.getBoundingClientRect().top + window.scrollY + (parseFloat(getComputedStyle(layout).paddingTop) || 0);
    this.runway = Math.max(200, natural - stickTop);
  },

  /** How far through the landing the page is: 0 in the hero, 1 landed. */
  progress() {
    return window.scrollY / this.runway;
  },

  /** The DOM card's share of the hand-over, 0..1. */
  show(op: number) {
    const h = this.hold;
    if (!h) return;
    const v = op.toFixed(3);
    if (h.style.opacity !== v) h.style.opacity = v;
    const vis = op > 0.001 ? "visible" : "hidden";
    if (h.style.visibility !== vis) h.style.visibility = vis;
  },

  /** The scene is gone (unmounted): the page owns the card again. */
  release() {
    const h = this.hold;
    if (!h) return;
    h.style.opacity = "";
    h.style.visibility = "";
  },
};
