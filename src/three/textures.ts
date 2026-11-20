import * as THREE from "three";

/**
 * Card faces drawn to a canvas at runtime.
 *
 * Generated rather than loaded so the scene ships no image assets and the
 * texture can't be a second network round-trip behind the hero.
 */

const FACE_W = 512;
const FACE_H = Math.round((FACE_W * 3.5) / 2.5);

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = FACE_W;
  c.height = FACE_H;
  return [c, c.getContext("2d")!];
}

function finish(c: HTMLCanvasElement, aniso: number) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

/** Ace of spades: one strong glyph reads at any distance. */
export function makeFaceTexture(aniso = 4) {
  const [c, x] = canvas();
  x.fillStyle = "#f4f2ee";
  x.fillRect(0, 0, FACE_W, FACE_H);

  // Paper tooth: sparse noise keeps the white from looking like plastic.
  const img = x.getImageData(0, 0, FACE_W, FACE_H);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() - 0.5) * 9;
    img.data[i] += v;
    img.data[i + 1] += v;
    img.data[i + 2] += v;
  }
  x.putImageData(img, 0, 0);

  x.strokeStyle = "rgba(20,22,28,0.35)";
  x.lineWidth = 4;
  x.strokeRect(16, 16, FACE_W - 32, FACE_H - 32);

  const spade = (cx: number, cy: number, s: number, color: string) => {
    x.save();
    x.translate(cx, cy);
    x.scale(s, s);
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(0, -52);
    x.bezierCurveTo(30, -18, 62, -4, 62, 22);
    x.bezierCurveTo(62, 46, 40, 58, 22, 50);
    x.bezierCurveTo(12, 46, 8, 38, 8, 30);
    x.lineTo(16, 74);
    x.lineTo(-16, 74);
    x.lineTo(-8, 30);
    x.bezierCurveTo(-8, 38, -12, 46, -22, 50);
    x.bezierCurveTo(-40, 58, -62, 46, -62, 22);
    x.bezierCurveTo(-62, -4, -30, -18, 0, -52);
    x.closePath();
    x.fill();
    x.restore();
  };

  spade(FACE_W / 2, FACE_H / 2, 1.85, "#15171d");
  x.fillStyle = "#15171d";
  x.font = "bold 62px ui-monospace, monospace";
  x.textAlign = "center";
  x.fillText("A", 74, 104);
  spade(74, 168, 0.42, "#15171d");
  x.save();
  x.translate(FACE_W - 74, FACE_H - 104);
  x.rotate(Math.PI);
  x.fillText("A", 0, 0);
  x.restore();
  spade(FACE_W - 74, FACE_H - 168, 0.42, "#15171d");

  return finish(c, aniso);
}

/** Back: a lattice, dark enough to read as the reverse at a glance. */
export function makeBackTexture(aniso = 4) {
  const [c, x] = canvas();
  x.fillStyle = "#1b2430";
  x.fillRect(0, 0, FACE_W, FACE_H);
  x.fillStyle = "#f4f2ee";
  x.fillRect(14, 14, FACE_W - 28, FACE_H - 28);
  x.fillStyle = "#24405e";
  x.fillRect(30, 30, FACE_W - 60, FACE_H - 60);

  x.strokeStyle = "rgba(210,226,245,0.32)";
  x.lineWidth = 3;
  const step = 34;
  x.save();
  x.beginPath();
  x.rect(30, 30, FACE_W - 60, FACE_H - 60);
  x.clip();
  for (let i = -FACE_H; i < FACE_W + FACE_H; i += step) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + FACE_H, FACE_H);
    x.stroke();
    x.beginPath();
    x.moveTo(i, FACE_H);
    x.lineTo(i + FACE_H, 0);
    x.stroke();
  }
  x.restore();
  return finish(c, aniso);
}

/**
 * The player card's face, for the card that folds into the plane and lands
 * as the page's player card.
 *
 * Drawn from the same coordinates as the DOM card's front (.pc-front in
 * styles/player.css, in card widths: 100 x 140), so when the flat 3D card
 * lands on the DOM one and cross-fades into it nothing moves. Corners are cut
 * to the DOM card's radius with alpha (the material alpha-tests them), so the
 * outline matches too.
 *
 * Returned at once and redrawn when the portrait and the fonts arrive: the
 * scene never waits on an image.
 */
export function makePlayerFaceTexture(portraitUrl: string, aniso = 4) {
  const TW = 1000;
  const TH = 1400;
  const U = TW / 100;
  const RAD = 4.5 * U;
  const STAR = "M8 1.2l2 4.3 4.7.5-3.5 3.2 1 4.6L8 11.4l-4.2 2.4 1-4.6L1.3 6l4.7-.5z";
  const SANS = '"Schibsted Grotesk Variable", system-ui, sans-serif';
  const MONO = '"JetBrains Mono Variable", ui-monospace, monospace';

  const c = document.createElement("canvas");
  c.width = TW;
  c.height = TH;
  const x = c.getContext("2d")!;
  const rr = (l: number, t: number, w: number, h: number, r: number) => {
    x.beginPath();
    x.roundRect(l, t, w, h, r);
  };

  const draw = (img: HTMLImageElement | null) => {
    x.clearRect(0, 0, TW, TH);
    x.save();
    rr(0, 0, TW, TH, RAD);
    x.clip();
    x.fillStyle = "#3a3222";
    x.fillRect(0, 0, TW, TH);
    // linear-gradient(160deg, rgba(255,255,255,.10), transparent 40%)
    const a = (160 * Math.PI) / 180;
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    const L = Math.abs(TW * dx) + Math.abs(TH * dy);
    const g = x.createLinearGradient(TW / 2 - (dx * L) / 2, TH / 2 - (dy * L) / 2, TW / 2 + (dx * L) / 2, TH / 2 + (dy * L) / 2);
    g.addColorStop(0, "rgba(255,255,255,.10)");
    g.addColorStop(0.4, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, TW, TH);

    x.textBaseline = "middle";
    x.fillStyle = "#f4f6fa";
    x.font = `800 ${6.4 * U}px ${SANS}`;
    x.letterSpacing = `${-0.02 * 6.4 * U}px`;
    x.fillText("Hemosoo Woo", 4.5 * U, 7.7 * U);
    x.letterSpacing = "0px";
    x.save();
    x.translate(TW - 10.5 * U, 4.7 * U);
    x.scale((6 * U) / 16, (6 * U) / 16);
    x.fillStyle = "#e5c07b";
    x.fill(new Path2D(STAR));
    x.restore();

    // The art window.
    const ax = 4.5 * U;
    const ay = 13.5 * U;
    const aw = 91 * U;
    const ah = 105.36 * U;
    const ar = 2.2 * U;
    x.save();
    rr(ax, ay, aw, ah, ar);
    x.clip();
    x.fillStyle = "#0b0f15";
    x.fillRect(ax, ay, aw, ah);
    if (img) {
      const k = Math.max(aw / img.naturalWidth, ah / img.naturalHeight);
      const dw = img.naturalWidth * k;
      const dh = img.naturalHeight * k;
      x.drawImage(img, ax + (aw - dw) * 0.5, ay + (ah - dh) * 0.3, dw, dh);
    }
    x.lineWidth = 1.2 * U;
    x.strokeStyle = "rgba(0,0,0,.35)";
    rr(ax, ay, aw, ah, ar);
    x.stroke();
    x.restore();
    x.lineWidth = 0.5 * U;
    x.strokeStyle = "rgba(255,255,255,.18)";
    rr(ax - 0.25 * U, ay - 0.25 * U, aw + 0.5 * U, ah + 0.5 * U, ar + 0.25 * U);
    x.stroke();

    // The type bar.
    const tx = 4.5 * U;
    const ty = 121.46 * U;
    const tw = 91 * U;
    const th = 8.24 * U;
    const tr = 1.4 * U;
    x.fillStyle = "rgba(5,6,8,.55)";
    rr(tx, ty, tw, th, tr);
    x.fill();
    x.save();
    rr(tx, ty, tw, th, tr);
    x.clip();
    x.lineWidth = 0.8 * U;
    x.strokeStyle = "rgba(255,255,255,.12)";
    x.stroke();
    x.restore();
    x.font = `700 ${4.2 * U}px ${SANS}`;
    x.fillStyle = "#e5c07b";
    x.fillText("Player", tx + 3 * U, ty + th / 2);
    const pw = x.measureText("Player").width;
    x.fillStyle = "#eef1f6";
    x.fillText(" — Backend developer", tx + 3 * U + pw, ty + th / 2);

    // The foot.
    x.font = `400 ${3.2 * U}px ${MONO}`;
    x.fillStyle = "rgba(244,246,250,.72)";
    x.fillText("001/001 · Penn · Amazon", 4.5 * U, 133.9 * U);
    x.textAlign = "right";
    x.fillText("hemosoo.com · 2026", TW - 4.5 * U, 133.9 * U);
    x.textAlign = "left";
    x.restore();
  };

  draw(null);
  const t = finish(c, aniso);
  const img = new Image();
  img.decoding = "async";
  const redraw = () => {
    draw(img.complete && img.naturalWidth ? img : null);
    t.needsUpdate = true;
  };
  img.onload = () => {
    if (document.fonts) document.fonts.ready.then(redraw);
    else redraw();
  };
  img.src = portraitUrl;
  document.fonts?.ready.then(redraw);
  return t;
}
