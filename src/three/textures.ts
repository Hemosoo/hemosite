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

