/**
 * Send: the card folds into a paper plane and carries my address down to
 * where it's written.
 *
 * When you copy my email at the bottom of the page, a 3D double of the card
 * appears exactly over the real one, which steps aside. It lifts, folds along
 * the same creases as the card on the original hemosoo.com (cardModel.ts: the
 * same 2.5 x 3.5 card, the same regions, the same nested pivots, so it really
 * folds rather than morphing), flies an arc to the address, touches down,
 * turns face up and unfolds into it. The real card is dealt back into its
 * place behind it.
 *
 * One transparent canvas covers the window, with a camera set so one world
 * unit at z = 0 is one CSS pixel, so the plane can aim at DOM rects. Both ends
 * are read every frame, so scrolling mid-flight doesn't throw it off. Nothing
 * is drawn, and no frame is requested, unless something is in the air.
 *
 * Loaded on demand (the first Copy), and only where it can fly: the caller
 * checks for WebGL, a wide enough window and no reduced-motion preference.
 */
import * as THREE from "three";
import { W as CW, H as CH, creases, halfRegions, polygonGeometry, type Crease } from "./cardModel";

/** The fold angles from the original site's FoldingCard.tsx. */
const FLAT = Math.PI * 0.965;
const HALF_CLOSE = 1.35;
const WING_BACK = 1.35;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const sine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const lerp = THREE.MathUtils.lerp;

/** The flight, in seconds. About two in all. */
const T = {
  lift: [0, 0.2],
  fold: [0.1, 0.66],
  fly: [0.6, 1.45],
  land: [1.45, 1.75],
  fade: [1.68, 1.95],
  /** The real card comes back into its place. */
  deal: [0.75, 1.15],
  end: 1.98,
} as const;

export interface SendArgs {
  /** The card on the page, which the plane is folded from. */
  card: HTMLElement;
  /** Where it lands: the address. */
  target: HTMLElement;
  /** As it touches down. */
  arrived(): void;
}

type Box = { left: number; top: number; width: number; height: number; right: number; bottom: number };

export function startSend(): { send: (a: SendArgs) => void; dispose: () => void } | null {
  const sky = document.createElement("canvas");
  sky.className = "e-sky";
  sky.setAttribute("aria-hidden", "true");
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: sky, alpha: true, antialias: true });
  } catch {
    return null;
  }
  document.body.appendChild(sky);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2620, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(-0.45, 0.75, 1);
  scene.add(sun);

  let VW = 1;
  let VH = 1;
  function resize() {
    VW = window.innerWidth;
    VH = window.innerHeight;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(VW, VH, false);
    const D = VH / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    camera.aspect = VW / VH;
    camera.position.set(0, 0, D);
    camera.near = D * 0.2;
    camera.far = D * 2;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  /** CSS pixels in the viewport -> world, at height z above the page. */
  const toWorld = (x: number, y: number, z = 0, out = new THREE.Vector3()) => out.set(x - VW / 2, VH / 2 - y, z);

  // ── the card, cut along its creases ─────────────────────────────────────
  const GEO: Record<string, THREE.BufferGeometry> = {};
  for (const sign of [-1, 1]) {
    for (const r of halfRegions(sign)) {
      const k = r.id.replace(/[LR]$/, "");
      GEO[`${k}${sign}`] = polygonGeometry(r.points, r.lift);
      GEO[`${k}${sign}b`] = polygonGeometry(r.points, r.lift - 0.004);
    }
  }
  /** A group whose origin sits on a crease, its child cancelled back into
   *  card space. ZYX so the fold turns about the crease, not about X. */
  function pivot(c: Crease) {
    const outer = new THREE.Group();
    const inner = new THREE.Group();
    outer.position.set(c.point[0], c.point[1], 0);
    outer.rotation.order = "ZYX";
    outer.rotation.z = c.angle;
    const [px, py] = c.point;
    const co = Math.cos(c.angle);
    const si = Math.sin(c.angle);
    inner.position.set(-px * co - py * si, px * si - py * co, 0);
    inner.rotation.z = -c.angle;
    outer.add(inner);
    return { outer, inner };
  }

  // ── faces, drawn from the card as it is on the page ─────────────────────
  const tex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const rounded = (x: CanvasRenderingContext2D, l: number, t: number, w: number, h: number, r: number) => {
    x.beginPath();
    x.roundRect(l, t, w, h, r);
  };

  /** The front: measured from the DOM card, so the plane is its double. */
  function faceFrom(card: HTMLElement) {
    // Measured unturned: if the card was showing its back, it's on its way to
    // the front, and a half-turned face would measure mirrored.
    const turn = card.querySelector<HTMLElement>(".c-card-turn");
    const saved = turn ? [turn.style.transition, turn.style.transform] : null;
    if (turn) {
      turn.style.transition = "none";
      turn.style.transform = "none";
    }
    try {
      return drawFace(card);
    } finally {
      if (turn && saved) {
        turn.style.transform = saved[1];
        void turn.offsetWidth;
        turn.style.transition = saved[0];
      }
    }
  }

  function drawFace(card: HTMLElement) {
    const front = card.querySelector<HTMLElement>(".c-front")!;
    const img = front.querySelector("img")!;
    const nm = front.querySelector<HTMLElement>(".nm")!;
    const no = front.querySelector<HTMLElement>(".no")!;
    const cr = front.getBoundingClientRect();
    const k = 1024 / cr.width; // canvas px per CSS px
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = Math.round((1024 * CH) / CW);
    const x = c.getContext("2d")!;
    const cs = getComputedStyle(front);
    const R = parseFloat(cs.borderTopLeftRadius) * k;
    rounded(x, 0, 0, c.width, c.height, R);
    x.save();
    x.clip();
    x.fillStyle = cs.backgroundColor || "#181613";
    x.fillRect(0, 0, c.width, c.height);

    // The photograph, cropped as the page crops it (object-fit: cover).
    const ir = img.getBoundingClientRect();
    const il = (ir.left - cr.left) * k;
    const it = (ir.top - cr.top) * k;
    const iw = ir.width * k;
    const ih = ir.height * k;
    const ir2 = parseFloat(getComputedStyle(img).borderTopLeftRadius) * k;
    x.save();
    rounded(x, il, it, iw, ih, ir2);
    x.clip();
    if (img.naturalWidth) {
      const s = Math.max(iw / img.naturalWidth, ih / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      const [px, py] = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
      x.drawImage(img, il + (iw - dw) * (px || 0.5), it + (ih - dh) * (py ?? 0.5), dw, dh);
    }
    x.restore();

    // The strip's two lines of type, where they sit.
    const text = (el: HTMLElement) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      x.font = `${s.fontWeight} ${parseFloat(s.fontSize) * k}px ${s.fontFamily}`;
      x.fillStyle = s.color;
      x.textBaseline = "alphabetic";
      // Baseline: the box's bottom less the font's descent, near enough.
      const m = x.measureText(el.textContent ?? "");
      const y = (r.top - cr.top) * k + (r.height * k + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      x.fillText(el.textContent ?? "", (r.left - cr.left) * k, y);
    };
    text(nm);
    text(no);
    x.restore();

    // The border, last, over everything.
    const bw = parseFloat(cs.borderTopWidth) * k;
    if (bw) {
      x.lineWidth = bw;
      x.strokeStyle = cs.borderTopColor;
      rounded(x, bw / 2, bw / 2, c.width - bw, c.height - bw, R - bw / 2);
      x.stroke();
    }
    return tex(c);
  }

  /** The back: a lighter warm stock with a fine printed lattice. Folded, the
   *  back is the plane's outside, so it has to read against the dark page. */
  const BACK = (() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = Math.round((512 * CH) / CW);
    const x = c.getContext("2d")!;
    rounded(x, 0, 0, c.width, c.height, 24);
    x.save();
    x.clip();
    x.fillStyle = "#cfc6b4";
    x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = "rgba(90,74,48,0.22)";
    x.lineWidth = 2;
    for (let i = -c.height; i < c.width + c.height; i += 22) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i + c.height, c.height);
      x.stroke();
      x.beginPath();
      x.moveTo(i, c.height);
      x.lineTo(i + c.height, 0);
      x.stroke();
    }
    x.restore();
    x.lineWidth = 10;
    x.strokeStyle = "#b9ae98";
    rounded(x, 5, 5, c.width - 10, c.height - 10, 20);
    x.stroke();
    return tex(c);
  })();

  const SHADOW = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,0.85)");
    g.addColorStop(0.55, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const SHADOW_GEO = new THREE.PlaneGeometry(1, 1);

  // ── a plane ──────────────────────────────────────────────────────────────
  class Plane {
    faceMat: THREE.MeshStandardMaterial;
    backMat: THREE.MeshStandardMaterial;
    root = new THREE.Group();
    body = new THREE.Group();
    refs: Record<number, { half: THREE.Group; wing: THREE.Group; nose: THREE.Group }> = {};
    shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    q = new THREE.Quaternion();
    bank = 0;
    o = 1;

    constructor(face: THREE.Texture) {
      const common = { roughness: 0.9, metalness: 0, transparent: true, alphaTest: 0.5 };
      this.faceMat = new THREE.MeshStandardMaterial({ map: face, side: THREE.FrontSide, ...common });
      this.backMat = new THREE.MeshStandardMaterial({ map: BACK, side: THREE.BackSide, ...common });
      this.root.add(this.body);
      for (const sign of [-1, 1]) {
        const c = creases(sign);
        const piece = (k: string) => {
          const g = new THREE.Group();
          g.add(new THREE.Mesh(GEO[`${k}${sign}`], this.faceMat), new THREE.Mesh(GEO[`${k}${sign}b`], this.backMat));
          return g;
        };
        const half = pivot(c.centre);
        const wing = pivot(c.wing);
        const nose = pivot(c.nose1);
        half.inner.add(piece("fuselage"), wing.outer);
        wing.inner.add(piece("wing"), nose.outer);
        nose.inner.add(piece("nose1"));
        this.body.add(half.outer);
        this.refs[sign] = { half: half.outer, wing: wing.outer, nose: nose.outer };
      }
      this.shadow = new THREE.Mesh(
        SHADOW_GEO,
        new THREE.MeshBasicMaterial({ map: SHADOW, transparent: true, depthWrite: false, opacity: 0 })
      );
      scene.add(this.shadow, this.root);
    }

    /** 0 = a flat card, 1 = a finished plane. The nose, then the body, then
     *  the wings, as on the original site. */
    fold(p: number) {
      const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
      const nose = ease(span(p, 0, 0.45)) * FLAT;
      const half = ease(span(p, 0.28, 0.76)) * HALF_CLOSE;
      const wing = ease(span(p, 0.6, 1)) * WING_BACK;
      for (const sign of [-1, 1]) {
        const d = -sign;
        const r = this.refs[sign];
        r.half.rotation.x = d * half;
        r.wing.rotation.x = d * wing;
        r.nose.rotation.x = d * nose;
      }
      // Folded, the nose leads; flat, the card is centred on its middle.
      this.body.position.y = -CH * 0.16 * p;
    }

    place(pos: THREE.Vector3, q: THREE.Quaternion, s: number, alt: number, heading: THREE.Vector3 | null) {
      this.root.position.copy(pos);
      this.root.quaternion.copy(q);
      this.root.scale.setScalar(s);
      // A soft shadow on the page, thrown down and right by the light.
      const size = s * CW * 1.1;
      this.shadow.position.set(pos.x + alt * 0.22 + 4, pos.y - alt * 0.4 - 6, -2);
      this.shadow.scale.set(size * (1 + alt / 260), size * 1.3 * (1 + alt / 260), 1);
      if (heading) this.shadow.rotation.z = Math.atan2(heading.y, heading.x) - Math.PI / 2;
      this.shadow.material.opacity = 0.42 * this.o * clamp01(1 - alt / 520);
    }

    opacity(o: number) {
      this.o = o;
      this.faceMat.opacity = this.backMat.opacity = o;
    }

    dispose() {
      scene.remove(this.root, this.shadow);
      this.faceMat.map?.dispose();
      this.faceMat.dispose();
      this.backMat.dispose();
      this.shadow.material.dispose();
    }
  }

  // ── orientation ──────────────────────────────────────────────────────────
  // The model flies nose +Y with its top toward -Z (the keel hangs to +Z).
  // Nose along the heading, top toward a hint just off the camera axis, so
  // the page sees the plane from above and a little behind; then the bank.
  const UP_HINT = new THREE.Vector3(0, 0.55, 1).normalize();
  const _h = new THREE.Vector3();
  const _u = new THREE.Vector3();
  const _x = new THREE.Vector3();
  const _z = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const _roll = new THREE.Quaternion();
  function orient(out: THREE.Quaternion, heading: THREE.Vector3, bank: number) {
    _h.copy(heading).normalize();
    _u.copy(UP_HINT).addScaledVector(_h, -UP_HINT.dot(_h));
    if (_u.lengthSq() < 1e-6) _u.set(0, 0, 1);
    _u.normalize();
    _x.crossVectors(_u, _h);
    _z.copy(_u).negate();
    _m.makeBasis(_x, _h, _z);
    out.setFromRotationMatrix(_m);
    _roll.setFromAxisAngle(_h, bank);
    return out.premultiply(_roll);
  }
  /** Face to the page, nose up: how the card lies on it. */
  const FLAT_FACE = new THREE.Quaternion();

  // ── flights ──────────────────────────────────────────────────────────────
  interface Flight {
    step(now: number, dt: number): boolean;
    end(): void;
  }
  const flights = new Set<Flight>();
  let raf = 0;
  let last = 0;
  // ?slow=4 plays the flight at quarter speed, for looking at the folds.
  const SLOW = Math.max(1, Number(new URLSearchParams(location.search).get("slow")) || 1);
  function frame(ms: number) {
    raf = 0;
    const now = ms / 1000 / SLOW;
    const dt = Math.min(1 / 30, last ? now - last : 1 / 60);
    last = now;
    for (const f of flights)
      if (!f.step(now, dt)) {
        f.end();
        flights.delete(f);
      }
    renderer.render(scene, camera);
    if (flights.size) raf = requestAnimationFrame(frame);
    else {
      last = 0;
      renderer.clear();
      sky.style.visibility = "hidden";
    }
  }
  function kick() {
    sky.style.visibility = "visible";
    if (!raf) raf = requestAnimationFrame(frame);
  }

  const centre = (r: Box): [number, number] => [r.left + r.width / 2, r.top + r.height / 2];

  function send({ card, target, arrived }: SendArgs) {
    // One at a time: a second Copy while one is in the air just copies.
    if (flights.size) return;
    const face = faceFrom(card);
    const pl = new Plane(face);

    const r0 = card.getBoundingClientRect();
    // Folding from the card if it can be seen. Otherwise (the usual case: the
    // card is at the top and the address at the bottom) the card comes down
    // into view from above, where it is, and folds there, in front of you.
    const seen = r0.bottom > 0 && r0.top < VH;
    const lead = seen ? 0 : 0.3;
    const sCard = r0.width / CW;
    const planeW = Math.min(140, Math.max(96, r0.width * 0.62));
    const sFly = planeW / CW;

    const pos = new THREE.Vector3();
    const head = new THREE.Vector3();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const want = new THREE.Quaternion();
    const qFold = new THREE.Quaternion();
    const qLand = new THREE.Quaternion();
    let t0: number | null = null;
    let landQ = false;
    let didArrive = false;
    let prevAng: number | null = null;

    // The card on the page steps aside for its double, and is dealt back.
    const hold = card.closest<HTMLElement>(".c-card-wrap") ?? card;
    if (seen) hold.style.opacity = "0";

    const f: Flight = {
      step(now, dt) {
        if (t0 === null) t0 = now;
        const t = now - t0 - lead;
        const cr: Box = card.getBoundingClientRect();
        const tr: Box = target.getBoundingClientRect();
        // Lands on the start of the address, just above its baseline.
        const L: [number, number] = [tr.left + Math.min(tr.width * 0.5, 120), tr.top + tr.height * 0.45];
        // Where it folds: on the card, or a little way into the window below it.
        const [cx, cy] = seen ? centre(cr) : [centre(cr)[0], Math.max(VH * 0.22, r0.height * 0.5 + 24)];
        const sLand = Math.max(28, tr.height * 1.4) / CH;

        let s = sFly;
        let alt = 0;
        let foldP = sine(span(t, T.fold[0], T.fold[1]));
        if (t < 0) {
          // Coming down into view, flat, from where the card is.
          const u = outCubic(clamp01((t + lead) / lead));
          alt = 18 * u;
          toWorld(cx, lerp(-r0.height * 0.6, cy, u), alt, pos);
          s = sCard;
          foldP = 0;
          pl.q.copy(FLAT_FACE);
        } else if (t < T.fly[0]) {
          // Lift off the page and fold, turning to face where it's going.
          const u = outCubic(span(t, T.lift[0], T.lift[1]));
          // Already in the air if it came down from above.
          alt = seen ? 18 * u : 18;
          toWorld(cx, cy - 10 * u, alt, pos);
          s = lerp(sCard, sFly, sine(span(t, T.fold[0], T.fold[1]))) * (1 + 0.04 * u);
          head.set(L[0] - cx, -(L[1] - cy) + 260, 0).normalize();
          orient(qFold, head, 0);
          pl.q.copy(FLAT_FACE).slerp(qFold, sine(span(t, T.fold[0] + 0.12, T.fly[0])));
        } else if (t < T.land[0]) {
          // A lifted arc, re-aimed every frame.
          foldP = 1;
          const w = sine(span(t, T.fly[0], T.fly[1]));
          const dist = Math.hypot(L[0] - cx, L[1] - cy);
          const A = Math.min(160, 40 + dist * 0.18);
          toWorld(cx, cy - 10, 18, a);
          toWorld(L[0], L[1], 0, c);
          b.addVectors(a, c).multiplyScalar(0.5);
          b.x += Math.min(220, dist * 0.25);
          b.z = 18;
          const k = 1 - w;
          pos.set(k * k * a.x + 2 * k * w * b.x + w * w * c.x, k * k * a.y + 2 * k * w * b.y + w * w * c.y, 0);
          alt = 18 + A * Math.sin(Math.PI * w);
          pos.z = alt;
          head.set(
            2 * k * (b.x - a.x) + 2 * w * (c.x - b.x),
            2 * k * (b.y - a.y) + 2 * w * (c.y - b.y),
            A * Math.PI * Math.cos(Math.PI * w) * 0.3
          );
          // Bank into the turn: the heading's rate of change on the page.
          const ang = Math.atan2(head.y, head.x);
          if (prevAng !== null) {
            let da = ang - prevAng;
            da = Math.atan2(Math.sin(da), Math.cos(da));
            const bw = Math.max(-0.7, Math.min(0.7, (da / dt) * 0.15));
            pl.bank += (bw - pl.bank) * Math.min(1, 8 * dt);
          }
          prevAng = ang;
          orient(want, head, pl.bank);
          pl.q.slerp(want, 1 - Math.exp(-14 * dt));
          s = sFly * (1 + 0.08 * Math.sin(Math.PI * w));
        } else {
          // Touch down on the address, turn face up, unfold, and fade into it.
          const u = sine(span(t, T.land[0], T.land[1]));
          if (!landQ) {
            qLand.copy(pl.q);
            landQ = true;
          }
          toWorld(L[0], L[1], 0, pos);
          pl.q.copy(qLand).slerp(FLAT_FACE, u);
          foldP = 1 - u;
          s = lerp(sFly, sLand, u);
          if (!didArrive && t >= T.land[0] + 0.12) {
            didArrive = true;
            arrived();
          }
          pl.opacity(1 - span(t, T.fade[0], T.fade[1]));
        }

        // The real card, dealt back into its place.
        if (seen) {
          const d = span(t, T.deal[0], T.deal[1]);
          hold.style.opacity = d.toFixed(3);
          hold.style.transform = d < 1 ? `translateY(${((1 - outCubic(d)) * -8).toFixed(2)}px)` : "";
        }

        pl.fold(foldP);
        pl.place(pos, pl.q, s, alt, t >= T.fly[0] && t < T.land[0] ? head : null);
        return t < T.end;

      },
      end() {
        hold.style.opacity = "";
        hold.style.transform = "";
        if (!didArrive) arrived();
        pl.dispose();
      },
    };
    flights.add(f);
    kick();
  }

  sky.style.visibility = "hidden";
  return {
    send,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      for (const f of flights) f.end();
      flights.clear();
      BACK.dispose();
      SHADOW.dispose();
      Object.values(GEO).forEach((g) => g.dispose());
      renderer.dispose();
      sky.remove();
    },
  };
}
