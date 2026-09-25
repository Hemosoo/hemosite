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
