/**
 * The card in hand: drag it and it folds into a paper plane; let go and it's
 * thrown, glides an arc, comes back, unfolds and settles into its slot.
 *
 * The DOM card (Card.tsx) is the card the page is built from: it's what you
 * read, tab to and turn over. This module only takes over while the card is
 * being folded or flown. On the first frame of a drag a 3D double, drawn from
 * measurements of the DOM card itself, appears exactly over it and the DOM
 * card goes transparent; when the double comes home flat and face up, the
 * DOM card comes back and this stops drawing. Nothing renders while nobody is
 * touching the card.
 *
 * The fold is the real one: the card is cut along the creases in
 * cardModel.ts, and each piece turns about its crease in the same order and
 * to the same angles as the site's hero (src/three/FoldingCard.tsx).
 *
 * One transparent canvas covers the window, with a camera placed so one world
 * unit at z = 0 is one CSS pixel. That's what lets the double sit exactly on
 * a DOM rect, and fly back to wherever that rect is now.
 */
import * as THREE from "three";
import { W as CW, H as CH, creases, halfRegions, polygonGeometry, type Crease } from "./cardModel";
import { SCORE } from "../score";

// ── the fold (FoldingCard.tsx) ───────────────────────────────────────────
const FLAT = Math.PI * 0.965;
const HALF_CLOSE = 1.35;
const WING_BACK = 1.35;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const lerp = THREE.MathUtils.lerp;

/** How far a drag has to travel to fold the card all the way, as a share of
 *  the card's width. */
const FOLD_REACH = 0.8;
/** Folded at least this far when let go, it's thrown; otherwise it unfolds
 *  where it is and goes back. */
const THROW_AT = 0.55;

export interface FoldOptions {
  /** True while the 3D double has the card (the DOM card should hide). */
  onActive: (active: boolean) => void;
}

export interface FoldHandle {
  /** Redraw the double from the DOM card (after a resize, say). */
  refresh: () => void;
  dispose: () => void;
}

type V2 = { x: number; y: number };

export function startFold(card: HTMLElement, opts: FoldOptions): FoldHandle | null {
  // ── renderer ───────────────────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.className = "f-sky";
  canvas.setAttribute("aria-hidden", "true");
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  document.body.appendChild(canvas);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10);
  // Soft, mostly from in front: paper in a room, not a spotlit prop. Faces
  // turned from the light still read as the same cream, a shade darker.
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x8a8174, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(-0.35, 0.7, 1);
  scene.add(sun);

  let VW = 1;
  let VH = 1;
  const resize = () => {
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
  };
  resize();

  /** CSS pixels in the viewport -> world, at height z above the page. */
  const toWorld = (x: number, y: number, z = 0, out = new THREE.Vector3()) => out.set(x - VW / 2, VH / 2 - y, z);

  // ── faces, drawn from the DOM card ──────────────────────────────────────
  const front = drawable();
  const back = drawable();
  const frontTex = texture(front.canvas);
  const backTex = texture(back.canvas);
  let drawnWidth = 0;

  /** Measure the DOM card and draw both faces to match it, pixel for pixel. */
  const redraw = () => {
    if (card.classList.contains("flipped")) return false;
    const r = card.getBoundingClientRect();
    if (!r.width) return false;
    // Measured flat: the tilt is put back to rest for the length of the read.
    const saved = ["--rx", "--ry", "--lit"].map((k) => [k, card.style.getPropertyValue(k)] as const);
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--lit", "0");
    try {
      paintFront(front, card, r);
      paintBack(back, card, r);
    } finally {
      saved.forEach(([k, v]) => (v ? card.style.setProperty(k, v) : card.style.removeProperty(k)));
    }
    frontTex.needsUpdate = true;
    backTex.needsUpdate = true;
    drawnWidth = r.width;
    return true;
  };

  // Lit for depth once it's folding, but at rest exactly its own print: the
  // texture is emitted at full strength and the lighting faded in.
  const faceMat = new THREE.MeshStandardMaterial({
    map: frontTex,
    emissiveMap: frontTex,
    emissive: new THREE.Color(0xffffff),
    roughness: 0.86,
    metalness: 0,
    side: THREE.FrontSide,
    alphaTest: 0.5,
  });
  const backMat = new THREE.MeshStandardMaterial({
    map: backTex,
    emissiveMap: backTex,
    emissive: new THREE.Color(0xffffff),
    roughness: 0.9,
    metalness: 0,
    side: THREE.BackSide,
    alphaTest: 0.5,
  });
  const light = (k: number) => {
    for (const m of [faceMat, backMat]) {
      m.color.setScalar(k * 0.92);
      m.emissiveIntensity = 1 - 0.72 * k;
    }
  };

  // ── the card, cut along its creases ─────────────────────────────────────
  const geos: THREE.BufferGeometry[] = [];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const pivots: Record<number, { half: THREE.Group; wing: THREE.Group; nose: THREE.Group }> = {};
  for (const sign of [-1, 1]) {
    const c = creases(sign);
    const regions = Object.fromEntries(halfRegions(sign).map((r) => [r.id.replace(/[LR]$/, ""), r]));
    const piece = (k: string) => {
      const g = new THREE.Group();
      const r = regions[k];
      const a = polygonGeometry(r.points, r.lift);
      const b = polygonGeometry(r.points, r.lift - 0.004);
      geos.push(a, b);
      g.add(new THREE.Mesh(a, faceMat), new THREE.Mesh(b, backMat));
      return g;
    };
    const half = pivot(c.centre);
    const wing = pivot(c.wing);
    const nose = pivot(c.nose1);
    half.inner.add(piece("fuselage"), wing.outer);
    wing.inner.add(piece("wing"), nose.outer);
    nose.inner.add(piece("nose1"));
    body.add(half.outer);
    pivots[sign] = { half: half.outer, wing: wing.outer, nose: nose.outer };
  }
  root.visible = false;
  scene.add(root);

  /** 0 = a flat card, 1 = a finished plane. The nose folds first, then the
   *  body, then the wings, overlapping the way the hero's fold does. */
  const fold = (p: number) => {
    const nose = easeInOut(span(p, 0, 0.45)) * FLAT;
    const half = easeInOut(span(p, 0.28, 0.76)) * HALF_CLOSE;
    const wing = easeInOut(span(p, 0.6, 1)) * WING_BACK;
    for (const sign of [-1, 1]) {
      const d = -sign;
      const r = pivots[sign];
      r.half.rotation.x = d * half;
      r.wing.rotation.x = d * wing;
      r.nose.rotation.x = d * nose;
    }
    // Folded, the nose leads; flat, the card is centred on its own middle.
    body.position.y = -CH * 0.16 * p;
  };

  // A soft shadow on the page under the plane, for height.
  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,0.8)");
    g.addColorStop(0.55, "rgba(0,0,0,0.3)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const shadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 })
  );
  scene.add(shadow);

  // ── orientation ────────────────────────────────────────────────────────
  // The model flies nose +Y with its top toward -Z. Nose along the heading,
  // top toward a hint just off the camera axis (the page sees the plane from
  // above and a little behind), then roll by the bank.
  const UP_HINT = new THREE.Vector3(0, 0.55, 1).normalize();
  const _h = new THREE.Vector3();
  const _u = new THREE.Vector3();
  const _x = new THREE.Vector3();
  const _z = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const _roll = new THREE.Quaternion();
  const orient = (out: THREE.Quaternion, heading: THREE.Vector3, bank: number) => {
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
  };
  /** Face up to the page, nose up: how the card lies in its slot. */
  const FLAT_FACE = new THREE.Quaternion();

  // ── state ───────────────────────────────────────────────────────────────
  type Mode = "idle" | "drag" | "fly" | "back";
  let mode: Mode = "idle";
  let raf = 0;
  let last = 0;

  /** What's drawn this frame: centre (CSS px), height, fold, attitude. */
  const pose = { c: { x: 0, y: 0 }, alt: 0, p: 0, q: new THREE.Quaternion(), scale: 1 };
  const slot = (): V2 & { w: number } => {
    const r = card.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
  };

  // Drag.
  let start: (V2 & { id: number; type: string; t: number }) | null = null;
  let hand = { x: 0, y: 0 };
  let samples: { x: number; y: number; t: number }[] = [];

  // Flight.
  let path: { S: V2; P1: V2; P2: V2; dur: number; t: number; p0: number; q0: THREE.Quaternion; bank: number; prevAng: number | null } | null =
    null;
  // Return without a throw.
  let ret: { t: number; dur: number; c0: V2; p0: number; alt0: number; q0: THREE.Quaternion } | null = null;

  const qFly = new THREE.Quaternion();
  const head = new THREE.Vector3();

  const place = () => {
    const s = slot();
    pose.scale = s.w / CW;
    toWorld(pose.c.x, pose.c.y, pose.alt, root.position);
    root.quaternion.copy(pose.q);
    root.scale.setScalar(pose.scale);
    fold(pose.p);
    light(smooth(clamp01(pose.p * 2.5)));
    // Shadow: down and right of the plane, more spread the higher it is.
    const size = pose.scale * CW * 1.05;
    const a = pose.alt;
    // On the page, behind every part of the folded card: the wings and keel
    // reach a card's height either side of its middle.
    shadow.position.set(root.position.x + a * 0.25 + 6, root.position.y - a * 0.45 - 10, -pose.scale * CH * 1.1 - 4);
    shadow.scale.set(size * (1 + a / 300), size * 1.2 * (1 + a / 300), 1);
    shadow.material.opacity = 0.42 * smooth(clamp01(pose.p * 1.6)) * clamp01(1 - a / 600);
  };

  const begin = (x: number, y: number) => {
    if (drawnWidth !== card.getBoundingClientRect().width) redraw();
    const s = slot();
    pose.c = { x: s.x, y: s.y };
    pose.alt = 0;
    pose.p = 0;
    pose.q.copy(FLAT_FACE);
    hand = { x, y };
    mode = "drag";
    root.visible = true;
    place();
    // The double is drawn before the DOM card hides: they're never both gone.
    renderer.render(scene, camera);
    opts.onActive(true);
    kick();
  };

  const end = () => {
    mode = "idle";
    path = null;
    ret = null;
    root.visible = false;
    shadow.material.opacity = 0;
    opts.onActive(false);
    renderer.clear();
  };

  const release = () => {
    if (mode !== "drag") return;
    if (pose.p < THROW_AT) {
      ret = { t: 0, dur: 0.34, c0: { ...pose.c }, p0: pose.p, alt0: pose.alt, q0: pose.q.clone() };
      mode = "back";
      return;
    }
    // The throw: the hand's velocity over the last few frames.
    const now = performance.now();
    const recent = samples.filter((s) => now - s.t < 90);
    const a = recent[0] ?? samples[0];
    const b = recent[recent.length - 1] ?? samples[samples.length - 1];
    let vx = 0;
    let vy = 0;
    if (a && b && b.t > a.t) {
      vx = ((b.x - a.x) / (b.t - a.t)) * 1000;
      vy = ((b.y - a.y) / (b.t - a.t)) * 1000;
    }
    let speed = Math.hypot(vx, vy);
    let dir: V2;
    if (speed > 150) dir = { x: vx / speed, y: vy / speed };
    else {
      // Let go without a flick: it's launched the way it was being pulled.
      const dx = pose.c.x - slot().x;
      const dy = pose.c.y - slot().y;
      const d = Math.hypot(dx, dy) || 1;
      dir = { x: dx / d, y: dy / d };
    }
    speed = THREE.MathUtils.clamp(speed, 700, 2400);

    const S = { ...pose.c };
    const T = slot();
    const room = Math.min(VW, VH);
    const reach = Math.min(room * 0.42, 170 + ((speed - 700) / 1700) * 280);
    // Curl back toward the middle of the window, not off its edge.
    const toMid = { x: VW / 2 - S.x, y: VH / 2 - S.y };
    const side = Math.sign(dir.x * toMid.y - dir.y * toMid.x) || 1;
    const perp = { x: -dir.y * side, y: dir.x * side };
    const m = T.w * 0.45;
    const inside = (p: V2) => ({
      x: THREE.MathUtils.clamp(p.x, m, VW - m),
      y: THREE.MathUtils.clamp(p.y, m, VH - m),
    });
    const P1 = inside({ x: S.x + dir.x * reach * 1.35 + perp.x * reach * 0.15, y: S.y + dir.y * reach * 1.35 + perp.y * reach * 0.15 });
    const P2 = inside({ x: T.x + dir.x * reach * 0.55 + perp.x * reach * 0.85, y: T.y + dir.y * reach * 0.55 + perp.y * reach * 0.85 });
    const length = Math.hypot(P1.x - S.x, P1.y - S.y) + Math.hypot(P2.x - P1.x, P2.y - P1.y) + Math.hypot(T.x - P2.x, T.y - P2.y);
    path = {
      S,
      P1,
      P2,
      dur: THREE.MathUtils.clamp(0.95 + length / 1500, 1.25, 2.1),
      t: 0,
      p0: pose.p,
      q0: pose.q.clone(),
      bank: 0,
      prevAng: null,
    };
    mode = "fly";
  };

  const bez = (a: number, b: number, c: number, d: number, s: number) => {
    const i = 1 - s;
    return i * i * i * a + 3 * i * i * s * b + 3 * i * s * s * c + s * s * s * d;
  };
  const bezT = (a: number, b: number, c: number, d: number, s: number) => {
    const i = 1 - s;
    return 3 * i * i * (b - a) + 6 * i * s * (c - b) + 3 * s * s * (d - c);
  };

  const step = (dt: number) => {
    const T = slot();
    if (mode === "drag" && start) {
      const dx = hand.x - start.x;
      const dy = hand.y - start.y;
      const dist = Math.hypot(dx, dy);
      const target = clamp01(dist / (T.w * FOLD_REACH));
      // The card comes part of the way with the hand, as if held by an edge.
      const k = Math.min(1, dt * 18);
      pose.p += (target - pose.p) * k;
      pose.c.x += (T.x + dx * 0.55 - pose.c.x) * k;
      pose.c.y += (T.y + dy * 0.55 - pose.c.y) * k;
      pose.alt += (pose.p * 40 - pose.alt) * k;
      // It stays face up while the nose corners fold in, so you see it fold,
      // then turns to point the way it's being pulled as the wings form.
      if (dist > 2) head.set(dx, -dy, 0).normalize();
      else head.set(0, 1, 0);
      orient(qFly, head, 0);
      pose.q.copy(FLAT_FACE).slerp(qFly, smooth(span(pose.p, 0.3, 1)));
    } else if (mode === "back" && ret) {
      ret.t += dt;
      const u = easeInOut(clamp01(ret.t / ret.dur));
      pose.c.x = lerp(ret.c0.x, T.x, u);
      pose.c.y = lerp(ret.c0.y, T.y, u);
      pose.p = lerp(ret.p0, 0, u);
      pose.alt = lerp(ret.alt0, 0, u);
      pose.q.copy(ret.q0).slerp(FLAT_FACE, u);
      if (u >= 1) return false;
    } else if (mode === "fly" && path) {
      path.t += dt;
      const t = clamp01(path.t / path.dur);
      // Thrown fast, slowing through the turn, gliding in to land.
      const s = 1 - Math.pow(1 - t, 1.7);
      const { S, P1, P2 } = path;
      pose.c.x = bez(S.x, P1.x, P2.x, T.x, s);
      pose.c.y = bez(S.y, P1.y, P2.y, T.y, s);
      pose.alt = 150 * Math.pow(Math.sin(Math.PI * s), 0.8);
      const tx = bezT(S.x, P1.x, P2.x, T.x, Math.min(s, 0.995));
      const ty = bezT(S.y, P1.y, P2.y, T.y, Math.min(s, 0.995));
      // Climbing out, descending in: the height's rate of change as pitch.
      head.set(tx, -ty, 150 * Math.PI * Math.cos(Math.PI * s) * 0.35);
      // Bank into the turn: how fast the heading is swinging on the page.
      const ang = Math.atan2(-ty, tx);
      if (path.prevAng !== null && dt > 0) {
        let da = ang - path.prevAng;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        const want = THREE.MathUtils.clamp((da / dt) * 0.16, -0.8, 0.8);
        path.bank += (want - path.bank) * Math.min(1, 8 * dt);
      }
      path.prevAng = ang;
      orient(qFly, head, path.bank);
      // Finishes folding as it leaves the hand; unfolds on the way in.
      const unfold = smooth(span(s, 0.7, 1));
      pose.p = lerp(lerp(path.p0, 1, smooth(span(path.t, 0, 0.18))), 0, unfold);
      pose.q.copy(path.q0).slerp(qFly, smooth(span(path.t, 0, 0.14)));
      pose.q.slerp(FLAT_FACE, smooth(span(s, 0.74, 1)));
      if (t >= 1) {
        pose.c = { x: T.x, y: T.y };
        pose.alt = 0;
        pose.p = 0;
        pose.q.copy(FLAT_FACE);
        return false;
      }
    }
    return true;
  };

  // ?slow=4 plays the throw at a quarter of the speed, for looking at it.
  const SLOW = Math.max(1, Number(new URLSearchParams(location.search).get("slow")) || 1);
  const frame = (ms: number) => {
    raf = 0;
    const now = ms / 1000 / SLOW;
    const dt = Math.min(1 / 30, last ? now - last : 1 / 60);
    last = now;
    const going = step(dt);
    place();
    renderer.render(scene, camera);
    if (going) raf = requestAnimationFrame(frame);
    else {
      last = 0;
      end();
    }
  };
  function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // ── pointer: a drag folds; a tap stays a tap (Card.tsx turns the card) ──
  const onDown = (e: PointerEvent) => {
    if (mode !== "idle" || !e.isPrimary || e.button > 0) return;
    if (card.classList.contains("flipped")) return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType, t: performance.now() };
    samples = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
  };
  const onMove = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (samples.length > 12) samples.shift();
    if (mode === "idle") {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (start.type === "touch") {
        // On a phone the page has to scroll: only a sideways pull folds.
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          start = null;
          return;
        }
        if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      } else if (Math.hypot(dx, dy) < 8) return;
      try {
        card.setPointerCapture(e.pointerId);
      } catch {
        /* the drag still works without capture */
      }
      begin(e.clientX, e.clientY);
    }
    if (mode === "drag") {
      hand = { x: e.clientX, y: e.clientY };
      kick();
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    start = null;
    if (mode === "drag") {
      release();
      kick();
    }
  };
  card.addEventListener("pointerdown", onDown);
  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerup", onUp);
  card.addEventListener("pointercancel", onUp);

  const onResize = () => {
    resize();
    if (mode === "idle") redraw();
  };
  window.addEventListener("resize", onResize);
  redraw();

  return {
    refresh: () => {
      if (mode === "idle") redraw();
    },
    dispose() {
      cancelAnimationFrame(raf);
      card.removeEventListener("pointerdown", onDown);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerup", onUp);
      card.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", onResize);
      if (mode !== "idle") opts.onActive(false);
      geos.forEach((g) => g.dispose());
      shadowGeo.dispose();
      shadowTex.dispose();
      shadow.material.dispose();
      faceMat.dispose();
      backMat.dispose();
      frontTex.dispose();
      backTex.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

/** A group whose origin sits on a crease, its child cancelled back into card
 *  space. ZYX, so the fold turns about the crease rather than about X. */
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

// ── drawing the faces from the DOM ────────────────────────────────────────

interface Drawable {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

const TEX_W = 1024;
const TEX_H = Math.round((TEX_W * 7) / 5);

function drawable(): Drawable {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  return { canvas, ctx: canvas.getContext("2d")! };
}

function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A box on the card, in the card's own pixels (unmirrored). */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function boxOf(el: Element, card: DOMRect, mirrored: boolean): Box | null {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  // The back face is turned 180° about its middle, so on screen its layout
  // comes out mirrored: undo that to get where things sit on the back itself.
  const x = mirrored ? card.right - r.right : r.left - card.left;
  return { x, y: r.top - card.top, w: r.width, h: r.height };
}

/** The card stock, as the stylesheet paints it. */
function paintStock(d: Drawable, k: number, radius: number) {
  const { ctx } = d;
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, TEX_W, TEX_H, radius * k);
  ctx.clip();
  // linear-gradient(170deg, #f1ebdd, var(--stock) 60%, #e3dbca)
  const a = (170 * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const L = Math.abs(TEX_W * dx) + Math.abs(TEX_H * dy);
  const g = ctx.createLinearGradient(TEX_W / 2 - (dx * L) / 2, TEX_H / 2 - (dy * L) / 2, TEX_W / 2 + (dx * L) / 2, TEX_H / 2 + (dy * L) / 2);
  g.addColorStop(0, "#f1ebdd");
  g.addColorStop(0.6, "#ece5d6");
  g.addColorStop(1, "#e3dbca");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  // A little tooth, so the stock reads as paper up close.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = "rgba(90,76,56,0.05)";
  for (let i = 0; i < 2600; i++) ctx.fillRect(rnd() * TEX_W, rnd() * TEX_H, 1.6, 1.6);
}

function scoreMarks(ctx: CanvasRenderingContext2D, color: string, scale: number) {
  const { noseY, wingX } = SCORE;
  const len = 2.6 * scale;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, 0.28 * scale);
  ctx.lineCap = "round";
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  line(TEX_W / 2, 0, TEX_W / 2, len);
  line(0, noseY * TEX_H, len, noseY * TEX_H);
  line(TEX_W, noseY * TEX_H, TEX_W - len, noseY * TEX_H);
  for (const fx of [wingX, 0.5, 1 - wingX]) line(fx * TEX_W, TEX_H, fx * TEX_W, TEX_H - len);
  ctx.restore();
}

/** One element's text, set where and how the stylesheet sets it. Wraps the
 *  way the DOM does when the box is more than one line tall. */
function text(ctx: CanvasRenderingContext2D, el: HTMLElement, b: Box, k: number) {
  const cs = getComputedStyle(el);
  const str = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!str) return;
  const size = parseFloat(cs.fontSize);
  ctx.save();
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size * k}px ${cs.fontFamily}`;
  const ls = parseFloat(cs.letterSpacing);
  ctx.letterSpacing = `${(Number.isFinite(ls) ? ls : 0) * k}px`;
  ctx.fillStyle = cs.color;
  ctx.globalAlpha = parseFloat(cs.opacity) || 1;
  ctx.textBaseline = "alphabetic";
  const lh = cs.lineHeight === "normal" ? size * 1.2 : parseFloat(cs.lineHeight);
  const m = ctx.measureText("Hg");
  const asc = m.fontBoundingBoxAscent;
  const desc = m.fontBoundingBoxDescent;
  // Where the first baseline sits in a line box of this height.
  const base = (lh * k - (asc + desc)) / 2 + asc;
  const lines = Math.max(1, Math.round(b.h / lh));
  const out: string[] = [];
  if (lines === 1) out.push(str);
  else {
    let cur = "";
    for (const w of str.split(" ")) {
      const next = cur ? `${cur} ${w}` : w;
      if (cur && ctx.measureText(next).width > b.w * k + 1) {
        out.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) out.push(cur);
  }
  const padTop = parseFloat(cs.paddingTop) || 0;
  const right = cs.textAlign === "right" || cs.textAlign === "end";
  out.forEach((line, i) => {
    const y = (b.y + padTop) * k + base + i * lh * k;
    const x = right ? (b.x + b.w) * k - ctx.measureText(line).width : b.x * k;
    ctx.fillText(line, x, y);
  });
  ctx.restore();
}

function paintFront(d: Drawable, card: HTMLElement, R: DOMRect) {
  const k = TEX_W / R.width;
  const face = card.querySelector<HTMLElement>(".bc-front");
  if (!face) return;
  const radius = parseFloat(getComputedStyle(face).borderTopLeftRadius) || 0;
  paintStock(d, k, radius);
  const { ctx } = d;
  const photo = face.querySelector<HTMLElement>(".bc-photo");
  const img = photo?.querySelector("img");
  if (photo) {
    const b = boxOf(photo, R, false);
    if (b) {
      const pr = (parseFloat(getComputedStyle(photo).borderTopLeftRadius) || 0) * k;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(b.x * k, b.y * k, b.w * k, b.h * k, pr);
      ctx.clip();
      ctx.fillStyle = "#2a2723";
      ctx.fillRect(b.x * k, b.y * k, b.w * k, b.h * k);
      if (img && img.complete && img.naturalWidth) {
        // object-fit: cover; object-position: 50% 30%
        const s = Math.max((b.w * k) / img.naturalWidth, (b.h * k) / img.naturalHeight);
        const w = img.naturalWidth * s;
        const h = img.naturalHeight * s;
        ctx.drawImage(img, b.x * k + (b.w * k - w) * 0.5, b.y * k + (b.h * k - h) * 0.3, w, h);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = TEX_W * 0.005;
      ctx.stroke();
      ctx.restore();
    }
  }
  for (const sel of [".bc-name", ".bc-serial", ".bc-line", ".bc-turn"]) {
    const el = face.querySelector<HTMLElement>(sel);
    const b = el && boxOf(el, R, false);
    if (el && b) text(ctx, el, b, k);
  }
  scoreMarks(ctx, "rgba(27,26,23,0.32)", TEX_W / 100);
  ctx.restore();
}

function paintBack(d: Drawable, card: HTMLElement, R: DOMRect) {
  const k = TEX_W / R.width;
  const face = card.querySelector<HTMLElement>(".bc-back");
  if (!face) return;
  const radius = parseFloat(getComputedStyle(face).borderTopLeftRadius) || 0;
  // Drawn the right way round first, then mirrored onto the texture: the back
  // of a mesh shows its texture flipped, so a mirrored print reads correctly.
  const plain = drawable();
  paintStock(plain, k, radius);
  const { ctx } = plain;
  const items: HTMLElement[] = [
    ...face.querySelectorAll<HTMLElement>(".bc-cap .bc-name, .bc-cap .bc-serial, .bc-figs .v, .bc-figs .l, .bc-also"),
  ].filter((el) => getComputedStyle(el).display !== "none");
  for (const el of items) {
    const b = boxOf(el, R, true);
    if (!b) continue;
    if (el.classList.contains("bc-also")) {
      const cs = getComputedStyle(el);
      const bw = parseFloat(cs.borderTopWidth) || 0;
      if (bw) {
        ctx.fillStyle = cs.borderTopColor;
        ctx.fillRect(b.x * k, b.y * k, b.w * k, Math.max(1, bw * k));
      }
    }
    text(ctx, el, b, k);
  }
  scoreMarks(ctx, "rgba(27,26,23,0.32)", TEX_W / 100);
  ctx.restore();
  const out = d.ctx;
  out.clearRect(0, 0, TEX_W, TEX_H);
  out.save();
  out.translate(TEX_W, 0);
  out.scale(-1, 1);
  out.drawImage(plain.canvas, 0, 0);
  out.restore();
}
