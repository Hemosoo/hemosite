/**
 * Where the hero's card comes home to, and where it starts from.
 *
 * The scene and the page don't share a React tree in any useful way, so
 * they meet here. The page registers two elements:
 *
 * - `stage`: an empty box beside the name in the hero, the card's size. The
 *   deck sits at its foot, the card folds in front of it, and the plane comes
 *   back to rest there. Everything in the hero is placed from this box's
 *   rect, so the scene composes with the type at any width.
 * - `slot`: the DOM card in the About section's side column. Scrolling down,
 *   the plane flies to it, unfolds, and lands on it exactly; then the DOM
 *   card fades in over its 3D double and the scene stops drawing.
 *
 * If the scene never runs (a phone, no WebGL, reduced motion) none of this is
 * used: the page puts the card in the hero and it is simply there.
 */
export const landing = {
  /** The hero box the deck and the resting plane belong to. */
  stage: null as HTMLElement | null,
  /** The DOM card the plane lands on. */
  slot: null as HTMLElement | null,
  /** The element whose opacity hands over between the 3D card and the DOM one. */
  hold: null as HTMLElement | null,
  /** Scroll distance over which the landing plays. */
  runway: 1,
  /** Put the card face up, if it was flipped, before the 3D card takes over. */
  unflip: null as (() => void) | null,

  /**
   * The landing ends when the card has come up to a comfortable place in the
   * window: a little above centre, never under the top edge.
   */
  measure() {
    const slot = this.slot;
    if (!slot) return;
    const r = slot.getBoundingClientRect();
    const docTop = r.top + window.scrollY;
    const rest = Math.min(160, Math.max(64, (window.innerHeight - r.height) * 0.3));
    this.runway = Math.max(200, docTop - rest);
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

/** Whether the scene can run here; the page lays itself out accordingly. */
export function sceneCanRun() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (!window.matchMedia("(min-width: 640px)").matches) return false;
  try {
    const probe = document.createElement("canvas");
    return !!(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}
