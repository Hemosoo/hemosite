/**
 * Air mail: opening a passage in the bio sends it by paper plane.
 *
 * A card slides out from behind the player card, folds into a plane along the
 * same creases as the hero's card (cardModel.ts: the same 2.5 x 3.5 card, the
 * same regions, the same nested pivots, so it genuinely folds rather than
 * morphing), flies an arc to the phrase, touches down, turns face up, unfolds
 * and becomes the passage. If the passage has a photograph, the plane's face
 * is that photograph and the flat card shrinks into its place in the line.
 *
 * One transparent canvas covers the window, with a camera set so one world
 * unit at z = 0 is one CSS pixel. That is what lets a plane aim at a DOM rect:
 * every frame it reads where the phrase is now, so it hits a target that moves
 * while the page scrolls. Nothing renders unless something is in the air.
 *
 * Loaded on demand, and only when WebGL works and motion is allowed; without
 * it the bio simply opens.
 */
import * as THREE from "three";
import { W as CW, H as CH, creases, halfRegions, polygonGeometry, type Crease } from "../three/cardModel";
import { photoUrl } from "../bio/content";
import type { Courier, Delivery } from "../bio/stretch";

/** The fold angles from FoldingCard.tsx. */
const FLAT = Math.PI * 0.965;
const HALF_CLOSE = 1.35;
const WING_BACK = 1.35;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const sine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const lerp = THREE.MathUtils.lerp;

/** Delivery timeline, seconds: out from behind the card, fold, fly, touch
 *  down, turn face up and unfold, then become the passage (or its photo). */
const T = {
  out: [0, 0.2],
  fold: [0.08, 0.46],
  fly: [0.4, 0.98],
  land: [0.98, 1.18],
  hand: 1.1,
  morph: [1.16, 1.4],
  end: 1.46,
} as const;

interface Options {
  /** The sticky bar: on a phone, planes leave from behind it once the
   *  player card has scrolled away. */
  bar: () => HTMLElement | null;
}

/** Returns the courier, or null if WebGL can't be had. */
export function startPost({ bar }: Options): { send: Courier; dispose: () => void } | null {
  const sky = document.createElement("canvas");
  sky.className = "am-sky";
  sky.setAttribute("aria-hidden", "true");
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: sky, alpha: true, antialias: true });
  } catch {
    return null;
  }
  // The route line, drawn in 2D under the planes.
  const routes = document.createElement("canvas");
  routes.className = "am-sky";
  routes.setAttribute("aria-hidden", "true");
  document.body.append(routes, sky);
  const rctx = routes.getContext("2d")!;

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3040, 1.45));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(-0.45, 0.75, 1);
  scene.add(sun);

  let VW = 1;
  let VH = 1;
  function resize() {
    VW = window.innerWidth;
    VH = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(VW, VH, false);
    routes.width = Math.round(VW * dpr);
    routes.height = Math.round(VH * dpr);
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const D = VH / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    camera.aspect = VW / VH;
    camera.position.set(0, 0, D);
    camera.near = D * 0.2;
    camera.far = D * 2;
    camera.updateProjectionMatrix();
    kick();
  }
  window.addEventListener("resize", resize);

  /** CSS pixels in the viewport -> world, at height z above the page. */
  const toWorld = (x: number, y: number, z = 0, out = new THREE.Vector3()) =>
    out.set(x - VW / 2, VH / 2 - y, z);
  const _p = new THREE.Vector3();
  const toScreen = (v: THREE.Vector3): [number, number] => {
    _p.copy(v).project(camera);
    return [((_p.x + 1) / 2) * VW, ((1 - _p.y) / 2) * VH];
  };

  // ── the card, cut along the hero card's creases ─────────────────────────
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

  // ── faces ────────────────────────────────────────────────────────────────
  const TW = 512;
  const TH = 717;
  const tex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  function rounded(x: CanvasRenderingContext2D, r: number) {
    x.beginPath();
    x.moveTo(r, 0);
    x.arcTo(TW, 0, TW, TH, r);
    x.arcTo(TW, TH, 0, TH, r);
    x.arcTo(0, TH, 0, 0, r);
    x.arcTo(0, 0, TW, 0, r);
    x.closePath();
  }
  function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement("canvas");
    c.width = TW;
    c.height = TH;
    return [c, c.getContext("2d")!];
  }

  /** The back: the hero deck's lattice, inside an airmail border. */
  const BACK = (() => {
    const [c, x] = canvas();
    rounded(x, 30);
    x.save();
    x.clip();
    x.fillStyle = "#1b2430";
    x.fillRect(0, 0, TW, TH);
    // Airmail chevrons in the site's red and blue, on cream.
    x.save();
    x.beginPath();
    x.rect(12, 12, TW - 24, TH - 24);
    x.rect(46, 46, TW - 92, TH - 92);
    x.clip("evenodd");
    const band = 26;
    for (let i = -TH; i < TW + TH; i += band * 4) {
      (
        [
          ["#e06c75", 0],
          ["#f4f2ee", 1],
          ["#61afef", 2],
          ["#f4f2ee", 3],
        ] as const
      ).forEach(([col, k]) => {
        x.fillStyle = col;
        x.beginPath();
        const o = i + k * band;
        x.moveTo(o, 0);
        x.lineTo(o + band, 0);
        x.lineTo(o + band - TH, TH);
        x.lineTo(o - TH, TH);
        x.fill();
      });
    }
    x.restore();
    x.fillStyle = "#24405e";
    x.fillRect(46, 46, TW - 92, TH - 92);
    x.save();
    x.beginPath();
    x.rect(46, 46, TW - 92, TH - 92);
    x.clip();
    x.strokeStyle = "rgba(210,226,245,0.32)";
    x.lineWidth = 3;
    for (let i = -TH; i < TW + TH; i += 34) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i + TH, TH);
      x.stroke();
      x.beginPath();
      x.moveTo(i, TH);
      x.lineTo(i + TH, 0);
      x.stroke();
    }
    x.restore();
    x.restore();
    return tex(c);
  })();

  const photos: Record<string, Promise<HTMLImageElement | null>> = {};
  const loadPhoto = (name: string) =>
    (photos[name] ??= new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = photoUrl(name);
    }));
  const faces: Record<string, THREE.Texture> = {};

  /** The front: the passage's photograph, or its name set like a card. */
  async function faceFor(o: Pick<Delivery, "id" | "photo" | "color" | "kick">) {
    if (faces[o.id]) return faces[o.id];
    const [c, x] = canvas();
    rounded(x, 30);
    x.save();
    x.clip();
    x.fillStyle = "#0e1117";
    x.fillRect(0, 0, TW, TH);
    const im = o.photo ? await loadPhoto(o.photo) : null;
    if (im) {
      const s = Math.max(TW / im.width, TH / im.height);
      x.drawImage(im, (TW - im.width * s) / 2, (TH - im.height * s) / 2, im.width * s, im.height * s);
      x.strokeStyle = o.color;
      x.globalAlpha = 0.75;
      x.lineWidth = 10;
      x.strokeRect(5, 5, TW - 10, TH - 10);
      x.globalAlpha = 1;
    } else {
      await document.fonts?.ready;
      x.strokeStyle = o.color;
      x.lineWidth = 8;
      x.globalAlpha = 0.85;
      x.strokeRect(22, 22, TW - 44, TH - 44);
      x.globalAlpha = 1;
      x.fillStyle = "#6b7280";
      x.font = '500 26px "JetBrains Mono Variable", "JetBrains Mono", monospace';
      x.fillText("hemosoo.com", 56, 92);
      // The passage's name, as large as fits.
      const words = String(o.kick[0]).split(" ");
      let size = 96;
      let lines: string[] = [];
      for (; size > 40; size -= 4) {
        x.font = `800 ${size}px "Schibsted Grotesk Variable", sans-serif`;
        lines = [];
        let cur = "";
        for (const w of words) {
          const next = cur ? `${cur} ${w}` : w;
          if (x.measureText(next).width > TW - 112 && cur) {
            lines.push(cur);
            cur = w;
          } else cur = next;
        }
        lines.push(cur);
        if (lines.length <= 3 && lines.every((l) => x.measureText(l).width <= TW - 112)) break;
      }
      x.fillStyle = o.color;
      const lh = size * 0.98;
      const top = TH / 2 - (lines.length * lh) / 2 + size * 0.75;
      lines.forEach((l, i) => x.fillText(l, 56, top + i * lh));
      if (o.kick[1]) {
        x.fillStyle = "#c3cad8";
        x.font = '500 32px "JetBrains Mono Variable", "JetBrains Mono", monospace';
        x.fillText(o.kick[1], 56, top + lines.length * lh + 18);
      }
      x.fillStyle = "#6b7280";
      x.font = '500 22px "JetBrains Mono Variable", "JetBrains Mono", monospace';
      x.fillText("by air", 56, TH - 64);
    }
    x.restore();
    return (faces[o.id] = tex(c));
  }

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
      this.faceMat = new THREE.MeshStandardMaterial({
        map: face,
        roughness: 0.88,
        metalness: 0,
        side: THREE.FrontSide,
        transparent: true,
        alphaTest: 0.4,
      });
      this.backMat = new THREE.MeshStandardMaterial({
        map: BACK,
        roughness: 0.92,
        metalness: 0,
        side: THREE.BackSide,
        transparent: true,
        alphaTest: 0.4,
      });
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

    /** 0 = a flat card, 1 = a finished plane. */
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
      // Folded, the nose leads; flat, the card is centred on its point.
      this.body.position.y = -CH * 0.16 * p;
    }

    place(pos: THREE.Vector3, q: THREE.Quaternion, sx: number, sy = sx, alt = 0, heading: THREE.Vector3 | null = null) {
      this.root.position.copy(pos);
      this.root.quaternion.copy(q);
      this.root.scale.set(sx, sy, (sx + sy) / 2);
      // A soft shadow on the page, thrown down and right by the light.
      const size = sx * CW * 1.15;
      this.shadow.position.set(pos.x + alt * 0.22 + 4, pos.y - alt * 0.4 - 6, -2);
      this.shadow.scale.set(size * (1 + alt / 260), size * 1.25 * (1 + alt / 260), 1);
      if (heading) this.shadow.rotation.z = Math.atan2(heading.y, heading.x) - Math.PI / 2;
      this.shadow.material.opacity = 0.4 * this.o * clamp01(1 - alt / 520);
    }

    opacity(o: number) {
      this.o = o;
      this.faceMat.opacity = this.backMat.opacity = o;
    }

    dispose() {
      scene.remove(this.root, this.shadow);
      this.faceMat.dispose();
      this.backMat.dispose();
      this.shadow.material.dispose();
    }
  }

  // ── orientation ──────────────────────────────────────────────────────────
  // The model flies nose +Y with its top toward -Z (the keel hangs to +Z, as
  // in flightPath.ts). Build the basis directly: nose along the heading, top
  // toward a hint just off the camera axis, so the page sees the plane from
  // above and a little behind, then roll by the bank.
  const UP_HINT = new THREE.Vector3(0, 0.55, 1).normalize();
  const FACE_CAMERA = new THREE.Vector3(0, 0, 1);
  const _h = new THREE.Vector3();
  const _u = new THREE.Vector3();
  const _x = new THREE.Vector3();
  const _z = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const _roll = new THREE.Quaternion();
  function orient(out: THREE.Quaternion, heading: THREE.Vector3, bank: number, hint = UP_HINT) {
    _h.copy(heading).normalize();
    _u.copy(hint).addScaledVector(_h, -hint.dot(_h));
    if (_u.lengthSq() < 1e-6) _u.set(0, 0, 1);
    _u.normalize();
    _x.crossVectors(_u, _h);
    _z.copy(_u).negate();
    _m.makeBasis(_x, _h, _z);
    out.setFromRotationMatrix(_m);
    _roll.setFromAxisAngle(_h, bank);
    return out.premultiply(_roll);
  }
  /** Back to the page, nose up: how a card sits behind the player card. */
  const UPRIGHT = orient(new THREE.Quaternion(), new THREE.Vector3(0, 1, 0), 0, FACE_CAMERA);
  /** Face to the page, nose up. */
  const FLAT_FACE = new THREE.Quaternion();

  // ── flights ──────────────────────────────────────────────────────────────
  interface Flight {
    step(now: number, dt: number): boolean;
    end(): void;
  }
  const flights = new Set<Flight>();
  let raf = 0;
  let last = 0;
  function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
  }
  // ?slow=4 plays every flight at quarter speed, for looking at the folds.
  const SLOW = Math.max(1, Number(new URLSearchParams(location.search).get("slow")) || 1);
  function frame(ms: number) {
    raf = 0;
    const now = ms / 1000 / SLOW;
    const dt = Math.min(1 / 30, last ? now - last : 1 / 60);
    last = now;
    rctx.clearRect(0, 0, VW, VH);
    for (const f of flights)
      if (!f.step(now, dt)) {
        f.end();
        flights.delete(f);
      }
    renderer.render(scene, camera);
    if (flights.size) raf = requestAnimationFrame(frame);
    else {
      last = 0;
      rctx.clearRect(0, 0, VW, VH);
      renderer.clear();
    }
  }

  /** The dotted route behind a plane, fading over half a second. */
  function route(pts: { x: number; y: number; t: number }[], now: number, color: string) {
    rctx.save();
    rctx.lineCap = "round";
    rctx.lineWidth = 1.6;
    rctx.setLineDash([1.5, 7]);
    for (let i = 1; i < pts.length; i++) {
      const age = now - pts[i].t;
      if (age > 0.55) continue;
      rctx.globalAlpha = 0.7 * (1 - age / 0.55);
      rctx.strokeStyle = color;
      rctx.beginPath();
      rctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      rctx.lineTo(pts[i].x, pts[i].y);
      rctx.stroke();
    }
    rctx.restore();
    while (pts.length && now - pts[0].t > 0.6) pts.shift();
  }

  type Box = { left: number; top: number; width: number; height: number; bottom: number };
  const centre = (r: Box): [number, number] => [r.left + r.width / 2, r.top + r.height / 2];
  /** Where a card leaving `r` toward (tx, ty) clears its edge. */
  function exitPoint(r: Box, tx: number, ty: number, clear: number): [number, number, number, number] {
    const [cx, cy] = centre(r);
    let dx = tx - cx;
    let dy = ty - cy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const d = Math.min(r.width / 2 / Math.max(1e-3, Math.abs(dx)), r.height / 2 / Math.max(1e-3, Math.abs(dy)));
    return [cx + dx * (d + clear), cy + dy * (d + clear), dx, dy];
  }

  async function send(o: Delivery) {
    const face = await faceFor(o);
    const pl = new Plane(face);
    const behind = !!o.from.closest("[data-card-slot]");
    const fs = parseFloat(getComputedStyle(o.trigger).fontSize) || 28;
    const fr0 = o.from.getBoundingClientRect();
    const cw = behind
      ? Math.min(VW < 600 ? 92 : 124, Math.max(72, fr0.width * 0.4))
      : Math.max(64, fs * 2.4);
    const sFly = cw / CW;
    const sLand = (fs * 1.9) / CH;
    const pts: { x: number; y: number; t: number }[] = [];
    const head = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const want = new THREE.Quaternion();
    const qFold = new THREE.Quaternion();
    const qLand = new THREE.Quaternion();
    let t0: number | null = null;
    let handed = false;
    let gone: number | null = null;
    let ph: HTMLElement | null = null;
    let arrived = false;
    let prevAng: number | null = null;
    let landQ = false;
    let lastL: [number, number] = centre(o.trigger.getBoundingClientRect());

    const f: Flight = {
      step(now, dt) {
        if (t0 === null) t0 = now;
        const t = now - t0;
        let fr: Box = o.from.getBoundingClientRect();
        // Scrolled away (a phone, mostly): the card leaves from behind the
        // sticky bar instead, so it is seen leaving rather than arriving.
        const barB = bar()?.getBoundingClientRect().bottom ?? 0;
        if (behind && fr.bottom < barB) {
          fr = { left: fr.left, width: fr.width, height: fr.height, top: barB - 6 - fr.height, bottom: barB - 6 };
        }
        // Where it is going, read fresh: the page may be scrolling under it.
        let L = lastL;
        if (o.trigger.isConnected) {
          const tr = o.trigger.getBoundingClientRect();
          L = [Math.min(VW - cw * 0.6, tr.right + fs * 0.4), tr.top + tr.height / 2];
          lastL = L;
        } else if (!handed && gone === null) {
          gone = t;
          o.cancel();
        }
        const [ex, ey, dx, dy] = exitPoint(fr, L[0], L[1], cw * (behind ? 0.75 : 0.3));
        const [cx, cy] = centre(fr);
        const E2: [number, number] = [ex + dx * cw * 0.18, ey + dy * cw * 0.18];

        let sx = sFly;
        let sy = sFly;
        let alt = 0;
        let foldP = clamp01(sine(span(t, T.fold[0], T.fold[1])));
        if (t < T.fly[0]) {
          // Out of the deck, then hanging there while it folds.
          const u = outCubic(span(t, T.out[0], T.out[1]));
          const v = sine(span(t, T.out[1], T.fly[0]));
          toWorld(lerp(cx, ex, u) + (E2[0] - ex) * v, lerp(cy, ey, u) + (E2[1] - ey) * v, 8 * u, pos);
          if (!behind) sx = sy = sFly * u;
          head
            .set(L[0] - E2[0], -(L[1] - E2[1]) - Math.min(240, Math.hypot(L[0] - E2[0], L[1] - E2[1]) * 0.6), 0)
            .normalize();
          orient(qFold, head, 0);
          pl.q.copy(UPRIGHT).slerp(qFold, sine(span(t, T.fold[0], T.fold[1])));
          alt = 8 * u;
        } else if (t < T.land[0]) {
          // A quadratic arc, lifted, re-aimed every frame.
          const w = sine(span(t, T.fly[0], T.fly[1]));
          const dist = Math.hypot(L[0] - E2[0], L[1] - E2[1]);
          const A = Math.min(170, 40 + dist * 0.22);
          toWorld(E2[0], E2[1], 8, a);
          toWorld(L[0], L[1], 0, c);
          b.addVectors(a, c).multiplyScalar(0.5);
          b.y += Math.min(240, dist * 0.32);
          b.z = 8;
          const k = 1 - w;
          pos.set(k * k * a.x + 2 * k * w * b.x + w * w * c.x, k * k * a.y + 2 * k * w * b.y + w * w * c.y, 0);
          alt = 8 + A * Math.sin(Math.PI * w);
          pos.z = alt;
          head.set(
            2 * k * (b.x - a.x) + 2 * w * (c.x - b.x),
            2 * k * (b.y - a.y) + 2 * w * (c.y - b.y),
            A * Math.PI * Math.cos(Math.PI * w) * 0.35
          );
          // Bank into the turn: the heading's rate of change on the page.
          const ang = Math.atan2(head.y, head.x);
          if (prevAng !== null) {
            let da = ang - prevAng;
            da = Math.atan2(Math.sin(da), Math.cos(da));
            const bw = Math.max(-0.8, Math.min(0.8, (da / dt) * 0.16));
            pl.bank += (bw - pl.bank) * Math.min(1, 8 * dt);
          }
          prevAng = ang;
          orient(want, head, pl.bank);
          pl.q.slerp(want, 1 - Math.exp(-16 * dt));
          sx = sy = sFly * (1 + 0.1 * Math.sin(Math.PI * w));
        } else {
          // Touch down, turn face up, unfold.
          const u = sine(span(t, T.land[0], T.land[1]));
          if (!landQ) {
            qLand.copy(pl.q);
            landQ = true;
          }
          toWorld(L[0], L[1], 0, pos);
          pl.q.copy(qLand).slerp(FLAT_FACE, u);
          foldP = 1 - u;
          sx = sy = lerp(sFly, sLand, u);
          if (t >= T.hand && !handed) {
            handed = true;
            const r = o.land();
            if (r === null) gone = t;
            else if (r !== true) ph = r;
          }
          if (ph && ph.isConnected) {
            // The photograph arrives: the flat card shrinks into its frame.
            const m = sine(span(t, T.morph[0], T.morph[1]));
            const pr = ph.getBoundingClientRect();
            const [px, py] = centre(pr);
            toWorld(lerp(L[0], px, m), lerp(L[1], py, m), 0, pos);
            sx = lerp(sLand, pr.width / CW, m);
            sy = lerp(sLand, pr.height / CH, m);
            if (t >= T.morph[0] + 0.12 && !arrived) {
              arrived = true;
              o.arrived(ph);
            }
            pl.opacity(1 - span(t, T.morph[0] + 0.1, T.morph[1]));
          } else if (handed) {
            pl.opacity(1 - span(t, T.hand, T.hand + 0.2));
            sx *= 1 - 0.12 * span(t, T.hand, T.hand + 0.2);
            sy = sx;
          }
        }
        if (gone !== null) pl.opacity(Math.min(pl.o, 1 - span(t, gone, gone + 0.22)));
        pl.fold(foldP);
        pl.place(pos, pl.q, sx, sy, alt, t >= T.fly[0] && t < T.land[0] ? head : null);
        if (t > T.out[1] && t < T.land[1]) {
          const [qx, qy] = toScreen(pos);
          pts.push({ x: qx, y: qy, t: now });
        }
        route(pts, now, o.color);
        const done =
          t > T.end || (gone !== null && t > gone + 0.24) || (handed && !ph && t > T.hand + 0.22);
        return !done || pts.some((p) => now - p.t < 0.55);
      },
      end() {
        if (ph && !arrived && ph.isConnected) o.arrived(ph);
        if (!handed) o.cancel();
        pl.dispose();
      },
    };
    flights.add(f);
    kick();
  }

  resize();
  // Warm the photographs, so the first delivery doesn't wait on a decode.
  ["amazon", "heyday", "acapella", "poker", "dunking"].forEach(loadPhoto);

  return {
    send: (d) => {
      void send(d);
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      for (const f of flights) f.end();
      flights.clear();
      Object.values(faces).forEach((t) => t.dispose());
      BACK.dispose();
      SHADOW.dispose();
      Object.values(GEO).forEach((g) => g.dispose());
      renderer.dispose();
      sky.remove();
      routes.remove();
    },
  };
}
