/**
 * V1's copy of the bio engine (src/bio/stretch.ts), with one addition:
 * `reveal`, which opens a set of passages at once (no planes) and scrolls
 * to the first, for the bar's Experience / Projects / Contact links.
 *
 * Stretchtext: the bio as one paragraph that opens in place.
 *
 * Every coloured phrase opens into a passage set right after it, inside the
 * sentence, and passages hold phrases of their own. The paragraph's height
 * animates from what it was to what it is, the new words fade in, and a
 * margin beside the paragraph carries a rule for each open passage (stepped
 * inward when nested) and, on a wide screen, the passage's name.
 *
 * It works on the DOM directly rather than through React state: opening a
 * passage has to measure the paragraph before and after, and lay the margin
 * out from the live line boxes of the passages, which is all layout reads
 * and writes in one frame. React owns the elements; this owns their insides.
 *
 * Opening a passage can be handed to a courier (the paper planes, see
 * airmail/post.ts). Without one, or with reduced motion, it just opens.
 * Closing is always instant, and so is the depth control.
 */
import { NODES as DEFAULT_NODES, photoUrl, type BioNode } from "../../bio/content";

export interface Delivery {
  id: string;
  trigger: HTMLElement;
  from: HTMLElement;
  color: string;
  kick: string[];
  photo: string | null;
  /**
   * Called as the plane touches down. Returns the photograph the plane should
   * become, true if the passage has none, or null if the phrase is gone (its
   * passage was closed mid-flight) and the plane should just fade.
   */
  land(): HTMLElement | true | null;
  arrived(photo: HTMLElement): void;
  cancel(): void;
}

export type Courier = (d: Delivery) => void;

export interface StretchState {
  open: number;
  total: number;
  /** Which preset the open set matches, if any: "0" Short, "1" More, "9" Everything. */
  depth: "0" | "1" | "9" | null;
}

interface Options {
  sheet: HTMLElement;
  bio: HTMLElement;
  margin: HTMLElement;
  /** Where deliveries leave from unless a click says otherwise. */
  origin: () => HTMLElement | null;
  onChange: (s: StretchState) => void;
  onAction: (name: string) => void;
  /** Called the first time anything is opened, so the hint can go. */
  onFirstUse: () => void;
  email: string;
  /** The bio to show. Defaults to the site's own (bio/content.ts); the design
   *  alternatives pass theirs (content/bio.ts). */
  nodes?: Record<string, BioNode>;
}

const TOKEN =
  /\[\[(\w+)\|([^\]]+)\]\]|\{\{(\w+)\|([^|}]+)(?:\|(tall))?\}\}|<<([^|>]+)(?:\|([^>]+))?>>|@@(\w+)\|([^@]+)@@|\(\((\w+)\|([^)]+)\)\)|¶/g;
/** Only the figures that are results go in mono, not years. */
const NUM = /(\b\d{1,3}(?:,\d{3})*\+|\b\d(?= architectures)|\b3rd\b)/g;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class Stretch {
  private o: Options;
  private nodes: Record<string, BioNode>;
  private total: number;
  private open = new Map<string, HTMLElement>();
  private triggers = new Map<string, HTMLButtonElement>();
  private parent: Record<string, string> = {};
  private sending = new Set<string>();
  private courier: Courier | null = null;
  private used = false;
  private marginQueued = false;
  private ro: ResizeObserver;
  private cleanups: Array<() => void> = [];

  constructor(o: Options) {
    this.o = o;
    this.nodes = o.nodes ?? DEFAULT_NODES;
    this.total = Object.keys(this.nodes).length - 1;
    // Every passage's parent, from the content up front: a stat on the card
    // can point into a passage whose parent has never been opened, and the
    // way there has to be known before anything is built.
    for (const [id, node] of Object.entries(this.nodes)) {
      for (const m of node.text.matchAll(/\[\[(\w+)\|/g)) this.parent[m[1]] = id;
    }
    for (const n of this.build("root")) o.bio.appendChild(n);
    this.ro = new ResizeObserver(() => this.layoutMargin());
    this.ro.observe(o.bio);
    document.fonts?.ready.then(() => this.layoutMargin());

    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") this.setDepth(this.currentDepth() + 1);
      if (e.key === "-" || e.key === "−" || e.key === "_") this.setDepth(Math.max(0, this.currentDepth() - 1));
    };
    // A tap anywhere else puts an enlarged photograph back.
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement | null)?.closest(".st-ph")) {
        o.bio.querySelectorAll(".st-ph.big").forEach((p) => p.classList.remove("big"));
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    this.cleanups.push(
      () => window.removeEventListener("keydown", onKey),
      () => window.removeEventListener("click", onClick)
    );
    this.update();
  }

  destroy() {
    this.ro.disconnect();
    this.cleanups.forEach((f) => f());
    this.o.bio.replaceChildren();
    this.o.margin.replaceChildren();
  }

  setCourier(c: Courier | null) {
    this.courier = c;
  }

  // ── building ──────────────────────────────────────────────────────────────

  private words(text: string, out: Node[]) {
    text.split(NUM).forEach((p, i) => {
      if (!p) return;
      if (i % 2 === 1) {
        const s = document.createElement("span");
        s.className = "st-num st-w";
        s.textContent = p;
        out.push(s);
        return;
      }
      for (const tok of p.split(/(\s+)/)) {
        if (!tok) continue;
        if (/^\s+$/.test(tok)) {
          out.push(document.createTextNode(tok));
          continue;
        }
        const s = document.createElement("span");
        s.className = "st-w";
        s.textContent = tok;
        out.push(s);
      }
    });
  }

  private build(id: string): Node[] {
    const text = this.nodes[id].text;
    const frag: Node[] = [];
    let last = 0;
    for (const m of text.matchAll(TOKEN)) {
      this.words(text.slice(last, m.index), frag);
      last = (m.index ?? 0) + m[0].length;
      if (m[1]) {
        // A phrase that opens.
        const child = m[1];
        this.parent[child] = id;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "st-x st-w";
        b.dataset.id = child;
        b.style.setProperty("--c", `var(${this.nodes[child].color})`);
        b.setAttribute("aria-expanded", "false");
        const lbl = document.createElement("span");
        lbl.textContent = m[2];
        const g = document.createElement("span");
        g.className = "st-g";
        g.setAttribute("aria-hidden", "true");
        g.textContent = "+";
        // A word joiner: the glyph is an inline-block, and may otherwise be
        // carried to the next line on its own.
        b.append(lbl, document.createTextNode("\u2060"), g);
        b.addEventListener("click", () => this.toggle(child));
        this.triggers.set(child, b);
        frag.push(b);
        // The "+" is an inline-block, which the line breaker may break after:
        // a word joiner keeps the comma that follows on the same line.
        frag.push(document.createTextNode("\u2060"));
      } else if (m[3]) {
        // A photograph set into the line.
        const b = document.createElement("button");
        b.type = "button";
        b.className = "st-ph st-w" + (m[5] ? " tall" : "");
        b.dataset.photo = m[3];
        b.setAttribute("aria-label", `Photo: ${m[4]}. Press to enlarge`);
        const img = document.createElement("img");
        img.src = photoUrl(m[3]);
        img.alt = m[4];
        img.draggable = false;
        b.appendChild(img);
        // Enlarge toward the middle of the screen, never off its edge.
        const aim = () => {
          const r = b.getBoundingClientRect();
          const x = (r.left + r.width / 2) / window.innerWidth;
          b.style.setProperty("--ox", x < 0.33 ? "0%" : x > 0.67 ? "100%" : "50%");
        };
        b.addEventListener("pointerenter", aim);
        b.addEventListener("focus", aim);
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          aim();
          b.classList.toggle("big");
        });
        b.addEventListener("blur", () => b.classList.remove("big"));
        frag.push(b);
        // The photo is an inline-block too: keep the comma or full stop after
        // it on its line.
        frag.push(document.createTextNode("\u2060"));
      } else if (m[6] === "MAIL") {
        const s = document.createElement("span");
        s.className = "st-mail";
        s.textContent = this.o.email;
        frag.push(s);
      } else if (m[6]) {
        const a = document.createElement("a");
        a.className = "st-lnk st-w";
        a.href = m[7];
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = m[6];
        frag.push(a);
      } else if (m[8]) {
        // Opens a passage elsewhere and goes there.
        const target = m[8];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "st-x st-w";
        b.style.setProperty("--c", `var(${this.nodes[target].color})`);
        const lbl = document.createElement("span");
        lbl.textContent = m[9];
        const g = document.createElement("span");
        g.className = "st-g";
        g.setAttribute("aria-hidden", "true");
        g.textContent = "→";
        // A word joiner: the glyph is an inline-block, and may otherwise be
        // carried to the next line on its own.
        b.append(lbl, document.createTextNode("\u2060"), g);
        b.addEventListener("click", () => this.go(target, undefined, b));
        frag.push(b);
      } else if (m[10]) {
        const action = m[10];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "st-act st-w";
        b.textContent = m[11];
        b.addEventListener("click", () => this.o.onAction(action));
        frag.push(b);
      } else {
        const br = document.createElement("span");
        br.className = "st-break";
        frag.push(br);
      }
    }
    this.words(text.slice(last), frag);
    return frag;
  }

  private depthOf(id: string) {
    let d = 1;
    for (let p = this.parent[id]; p && p !== "root"; p = this.parent[p]) d++;
    return d;
  }

  /** Animate the paragraph's height from what it was to what it is now. */
  private reflow(change: () => void) {
    const { sheet } = this.o;
    const before = sheet.offsetHeight;
    change();
    this.layoutMargin();
    if (reducedMotion()) return;
    const after = sheet.offsetHeight;
    if (before === after) return;
    sheet.classList.add("moving");
    const a = sheet.animate([{ height: `${before}px` }, { height: `${after}px` }], {
      duration: Math.min(700, 260 + Math.abs(after - before) * 0.35),
      easing: "cubic-bezier(.16,1,.3,1)",
    });
    a.onfinish = a.oncancel = () => sheet.classList.remove("moving");
  }

  private expand(id: string, animate = true) {
    if (this.open.has(id)) return;
    const b = this.triggers.get(id);
    if (!b) return;
    const node = this.nodes[id];
    const span = document.createElement("span");
    span.className = `st-exp d${Math.min(3, this.depthOf(id))}`;
    span.dataset.of = id;
    span.style.setProperty("--c", `var(${node.color})`);
    // The passage's name, for screens with no margin to hold it.
    const k = document.createElement("span");
    k.className = "st-kick";
    k.setAttribute("aria-hidden", "true");
    k.textContent = (node.kick ?? []).join(" · ");
    span.appendChild(k);
    for (const n of this.build(id)) span.appendChild(n);
    if (animate && !reducedMotion()) {
      let n = 0;
      span.querySelectorAll<HTMLElement>(":scope > .st-w").forEach((w) => {
        w.classList.add("in");
        w.style.animationDelay = `${Math.min(520, n++ * 14)}ms`;
      });
    }
    b.after(span);
    b.setAttribute("aria-expanded", "true");
    this.open.set(id, span);
  }

  private collapse(id: string) {
    const span = this.open.get(id);
    if (!span) return;
    for (const [cid] of [...this.open]) {
      const t = this.triggers.get(cid);
      if (cid !== id && t && span.contains(t)) this.open.delete(cid);
    }
    span.remove();
    this.open.delete(id);
    this.triggers.get(id)?.setAttribute("aria-expanded", "false");
  }

  // ── delivery ──────────────────────────────────────────────────────────────

  private photoOf(id: string) {
    const m = /\{\{(\w+)\|[^|}]+(\|tall)?\}\}/.exec(this.nodes[id].text);
    return m ? m[1] : null;
  }

  private deliver(
    id: string,
    { from, openFn, after }: { from?: HTMLElement; openFn?: () => void; after?: () => void } = {}
  ) {
    const t = this.triggers.get(id);
    const openNow = () => {
      this.reflow(openFn ?? (() => this.expand(id)));
      this.update();
      after?.();
    };
    const origin = from ?? this.o.origin();
    if (!this.courier || !t || !t.isConnected || !origin || reducedMotion()) {
      openNow();
      return;
    }
    if (this.sending.has(id)) return;
    this.sending.add(id);
    t.classList.add("sending");
    t.setAttribute("aria-busy", "true");
    const done = () => {
      this.sending.delete(id);
      t.classList.remove("sending");
      t.removeAttribute("aria-busy");
    };
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue(this.nodes[id].color ?? "--color-yellow")
      .trim();
    this.courier({
      id,
      trigger: t,
      from: origin,
      color,
      kick: this.nodes[id].kick ?? [id],
      photo: this.photoOf(id),
      land: () => {
        done();
        if (!t.isConnected) return null;
        openNow();
        const ph = this.open.get(id)?.querySelector<HTMLElement>(":scope > .st-ph");
        if (!ph) return true;
        ph.classList.add("arriving");
        return ph;
      },
      arrived: (ph) => {
        ph.classList.remove("arriving");
        ph.classList.add("landed");
      },
      cancel: done,
    });
  }

  private firstUse() {
    if (this.used) return;
    this.used = true;
    this.o.onFirstUse();
  }

  toggle(id: string) {
    this.firstUse();
    if (this.open.has(id)) {
      this.reflow(() => this.collapse(id));
      this.update();
      return;
    }
    this.deliver(id);
  }

  /** Open a passage and everything above it, so it can be seen. */
  private openPath(id: string) {
    const chain: string[] = [];
    for (let p: string | undefined = id; p && p !== "root"; p = this.parent[p]) chain.unshift(p);
    chain.forEach((c) => this.expand(c));
  }

  /** Where a stat or a cross-reference points: the figure if it is showing,
   *  otherwise the nearest phrase that leads to it. */
  targetFor(id: string, value?: string): HTMLElement | null {
    const span = this.open.get(id);
    if (span && value) {
      const hit = [...span.querySelectorAll<HTMLElement>(".st-num")].find((n) => n.textContent === value);
      if (hit) return hit;
    }
    for (let p: string | undefined = id; p && p !== "root"; p = this.parent[p]) {
      const t = this.triggers.get(p);
      if (t && t.isConnected) return t;
    }
    return null;
  }

  pulse(el: HTMLElement | null, id: string) {
    if (!el) return;
    el.style.setProperty("--c", `var(${this.nodes[id].color})`);
    el.classList.remove("st-pulse");
    void el.offsetWidth;
    el.classList.add("st-pulse");
  }

  /** Light the place a stat points to, without opening anything. */
  light(id: string, value?: string) {
    this.pulse(this.targetFor(id, value), id);
  }

  /** Open a passage from somewhere else (a stat on the card, a cross-reference)
   *  and go to it. The plane leaves from wherever the click was. */
  go(id: string, value?: string, from?: HTMLElement) {
    this.firstUse();
    const smooth: ScrollBehavior = reducedMotion() ? "auto" : "smooth";
    const reveal = () => {
      const t = this.targetFor(id, value);
      if (!t) return;
      t.scrollIntoView({ behavior: smooth, block: "center" });
      this.pulse(t, id);
      if (t.matches("button")) t.focus({ preventScroll: true });
    };
    if (this.open.has(id)) {
      reveal();
      return;
    }
    // The nearest phrase on the way there that can be seen takes the delivery.
    const chain: string[] = [];
    for (let p: string | undefined = id; p && p !== "root"; p = this.parent[p]) chain.unshift(p);
    const first = chain.find((c) => !this.open.has(c));
    if (!first) return;
    this.triggers.get(first)?.scrollIntoView({ behavior: smooth, block: "center" });
    this.deliver(first, { from, openFn: () => this.openPath(id), after: () => requestAnimationFrame(reveal) });
  }

  /**
   * Open these passages (and everything above them) in one reflow, without
   * planes, and bring the first into view. Used by navigation, where the
   * visitor asked to see something rather than to be shown how it arrives.
   */
  reveal(ids: string[], focus: string = ids[0]) {
    this.firstUse();
    this.reflow(() => ids.forEach((id) => this.openPath(id)));
    this.update();
    const smooth: ScrollBehavior = reducedMotion() ? "auto" : "smooth";
    requestAnimationFrame(() => {
      const t = this.triggers.get(focus);
      if (!t) return;
      t.scrollIntoView({ behavior: smooth, block: "start" });
      this.pulse(t, focus);
    });
  }

  setDepth(depth: number) {
    this.firstUse();
    this.reflow(() => {
      let changed = true;
      while (changed) {
        changed = false;
        for (const [id, b] of this.triggers) {
          if (!b.isConnected) continue;
          const d = this.depthOf(id);
          if (d <= depth && !this.open.has(id)) {
            this.expand(id);
            changed = true;
          }
          if (d > depth && this.open.has(id)) {
            this.collapse(id);
            changed = true;
          }
        }
      }
    });
    this.update();
  }

  currentDepth() {
    let max = 0;
    for (const [id] of this.open) max = Math.max(max, this.depthOf(id));
    return max;
  }

  private update() {
    const level1 = [...this.triggers.keys()].filter((id) => this.depthOf(id) === 1);
    const isMore =
      this.open.size > 0 &&
      [...this.open.keys()].every((id) => this.depthOf(id) === 1) &&
      level1.every((id) => this.open.has(id));
    const depth =
      this.open.size === 0 ? "0" : this.open.size === this.total ? "9" : isMore ? "1" : null;
    this.o.onChange({ open: this.open.size, total: this.total, depth });
  }

  // ── the margin ────────────────────────────────────────────────────────────

  /** One rule beside each open passage, nested passages stepped inward, and
   *  on a wide screen the passage's name beside its first line. */
  private layoutMargin() {
    if (this.marginQueued) return;
    this.marginQueued = true;
    requestAnimationFrame(() => {
      this.marginQueued = false;
      const { margin, sheet, bio } = this.o;
      margin.replaceChildren();
      if (!this.open.size) return;
      const base = sheet.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(bio).lineHeight) || 40;
      const wide = window.matchMedia("(min-width: 901px)").matches;
      const items: { id: string; depth: number; top: number; bottom: number }[] = [];
      for (const [id, span] of this.open) {
        const rs = [...span.getClientRects()].filter((r) => r.width > 1);
        const t = this.triggers.get(id)?.getBoundingClientRect();
        if (!rs.length || !t) continue;
        items.push({
          id,
          depth: this.depthOf(id),
          top: Math.min(t.top, ...rs.map((r) => r.top)) - base.top,
          bottom: Math.max(...rs.map((r) => r.bottom)) - base.top,
        });
      }
      const step = wide ? 7 : 4;
      for (const it of items) {
        const r = document.createElement("div");
        r.className = "st-mrule";
        r.style.setProperty("--c", `var(${this.nodes[it.id].color})`);
        r.style.top = `${it.top + 4}px`;
        r.style.height = `${Math.max(8, it.bottom - it.top - 8)}px`;
        r.style.right = `${(wide ? 12 : 4) + (it.depth - 1) * step}px`;
        margin.appendChild(r);
      }
      if (!wide) return;
      let floor = -Infinity;
      for (const it of items.sort((a, b) => a.top - b.top)) {
        const l = document.createElement("div");
        l.className = "st-mlabel";
        l.style.setProperty("--c", `var(${this.nodes[it.id].color})`);
        const [a, b] = this.nodes[it.id].kick ?? [it.id];
        l.textContent = a;
        if (b) {
          const s = document.createElement("span");
          s.textContent = b;
          l.appendChild(s);
        }
        margin.appendChild(l);
        let top = it.top + (lh - 15) / 2;
        if (top < floor) top = floor;
        l.style.top = `${top}px`;
        floor = top + l.offsetHeight + 8;
      }
    });
  }
}
