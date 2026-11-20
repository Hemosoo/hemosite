import * as THREE from "three";

/**
 * The player card's face, for the 3D card that leaves the deck, folds into
 * the plane and lands as the page's card.
 *
 * Every coordinate here is the DOM front's (.v1c-front in site/site.css, in
 * card-width units: the card is 100 x 140), so when the flat 3D card lands on
 * the DOM card and cross-fades into it nothing moves. The corner the DOM card
 * turns down (the flip affordance) is cut and folded here too.
 *
 * Returned at once and redrawn when the portrait and the fonts arrive: the
 * scene never waits on an image.
 */
export const FACE = {
  radius: 4.5,
  inset: 2.4,
  name: { x: 6, y: 8.6, size: 6.2 },
  no: { x: 94, y: 8.6, size: 3.1 },
  art: { x: 6, y: 13.4, w: 88, h: 100, r: 2 },
  type: { x: 6, y: 116.2, w: 88, h: 8.4, r: 1.4, size: 3.9 },
  foot: { y: 131, size: 3, right: 84 },
  ear: 8.5,
} as const;

export const TYPE_LINE = ["Player", "Backend · Infra · Applied AI"] as const;
export const FOOT_LINE = ["Penn ’27 · Amazon ×3", "hemosoo.com"] as const;

export function makePlayerFaceTexture(portraitUrl: string, aniso = 4) {
  const TW = 1000;
  const TH = 1400;
  const U = TW / 100;
  const SANS = '"Schibsted Grotesk Variable", system-ui, sans-serif';
  const MONO = '"JetBrains Mono Variable", ui-monospace, monospace';

  const c = document.createElement("canvas");
  c.width = TW;
  c.height = TH;
  const x = c.getContext("2d")!;
  const rr = (l: number, t: number, w: number, h: number, r: number) => {
    x.beginPath();
    x.roundRect(l * U, t * U, w * U, h * U, r * U);
  };

  const draw = (img: HTMLImageElement | null) => {
    x.clearRect(0, 0, TW, TH);
    x.save();
    rr(0, 0, 100, 140, FACE.radius);
    x.clip();

    // The frame: worn bronze, lit from the top left.
    const g = x.createLinearGradient(0, 0, TW * 0.55, TH);
    g.addColorStop(0, "#3d3526");
    g.addColorStop(0.55, "#2b2519");
    g.addColorStop(1, "#1e1a13");
    x.fillStyle = g;
    x.fillRect(0, 0, TW, TH);
    // The inner hairline that makes it a card and not a panel.
    x.lineWidth = 0.35 * U;
    x.strokeStyle = "rgba(228,189,120,.38)";
    rr(FACE.inset, FACE.inset, 100 - FACE.inset * 2, 140 - FACE.inset * 2, 3);
    x.stroke();

    x.textBaseline = "middle";
    x.fillStyle = "#f4f6fa";
    x.font = `800 ${FACE.name.size * U}px ${SANS}`;
    x.letterSpacing = `${-0.02 * FACE.name.size * U}px`;
    x.fillText("Hemosoo Woo", FACE.name.x * U, FACE.name.y * U);
    x.letterSpacing = "0px";
    x.font = `500 ${FACE.no.size * U}px ${MONO}`;
    x.fillStyle = "rgba(244,246,250,.62)";
    x.textAlign = "right";
    x.fillText("No. 001", FACE.no.x * U, FACE.no.y * U);
    x.textAlign = "left";

    // The portrait.
    const a = FACE.art;
    x.save();
    rr(a.x, a.y, a.w, a.h, a.r);
    x.clip();
    x.fillStyle = "#0b0f15";
    x.fillRect(a.x * U, a.y * U, a.w * U, a.h * U);
    if (img) {
      const k = Math.max((a.w * U) / img.naturalWidth, (a.h * U) / img.naturalHeight);
      const dw = img.naturalWidth * k;
      const dh = img.naturalHeight * k;
      x.drawImage(img, a.x * U + (a.w * U - dw) * 0.5, a.y * U + (a.h * U - dh) * 0.3, dw, dh);
    }
    x.lineWidth = 1.2 * U;
    x.strokeStyle = "rgba(0,0,0,.35)";
    rr(a.x, a.y, a.w, a.h, a.r);
    x.stroke();
    x.restore();
    x.lineWidth = 0.5 * U;
    x.strokeStyle = "rgba(255,255,255,.16)";
    rr(a.x - 0.25, a.y - 0.25, a.w + 0.5, a.h + 0.5, a.r + 0.25);
    x.stroke();

    // The type bar.
    const t = FACE.type;
    x.fillStyle = "rgba(5,6,8,.55)";
    rr(t.x, t.y, t.w, t.h, t.r);
    x.fill();
    x.lineWidth = 0.5 * U;
    x.strokeStyle = "rgba(255,255,255,.12)";
    rr(t.x, t.y, t.w, t.h, t.r);
    x.stroke();
    x.font = `700 ${t.size * U}px ${SANS}`;
    x.fillStyle = "#e4bd78";
    x.fillText(TYPE_LINE[0], (t.x + 3) * U, (t.y + t.h / 2) * U);
    const pw = x.measureText(`${TYPE_LINE[0]}  `).width;
    x.font = `600 ${t.size * U}px ${SANS}`;
    x.fillStyle = "#eef1f6";
    x.fillText(TYPE_LINE[1], (t.x + 3) * U + pw, (t.y + t.h / 2) * U);

    // The foot.
    x.font = `500 ${FACE.foot.size * U}px ${MONO}`;
    x.fillStyle = "rgba(244,246,250,.7)";
    x.fillText(FOOT_LINE[0], 6 * U, FACE.foot.y * U);
    x.textAlign = "right";
    x.fillText(FOOT_LINE[1], FACE.foot.right * U, FACE.foot.y * U);
    x.textAlign = "left";

    // The turned-down corner: cut away, and the flap laid over it.
    const e = FACE.ear;
    x.save();
    x.globalCompositeOperation = "destination-out";
    x.beginPath();
    x.moveTo(100 * U, (140 - e) * U);
    x.lineTo(100 * U, 140 * U);
    x.lineTo((100 - e) * U, 140 * U);
    x.closePath();
    x.fill();
    x.restore();
    const fg = x.createLinearGradient((100 - e) * U, (140 - e) * U, 100 * U, 140 * U);
    fg.addColorStop(0, "#f1e6cc");
    fg.addColorStop(1, "#b59f74");
    x.fillStyle = fg;
    x.beginPath();
    x.moveTo((100 - e) * U, (140 - e) * U);
    x.lineTo(100 * U, (140 - e) * U);
    x.lineTo((100 - e) * U, 140 * U);
    x.closePath();
    x.fill();

    x.restore();
  };

  draw(null);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  const img = new Image();
  img.decoding = "async";
  const redraw = () => {
    draw(img.complete && img.naturalWidth ? img : null);
    tex.needsUpdate = true;
  };
  img.onload = () => {
    if (document.fonts) document.fonts.ready.then(redraw);
    else redraw();
  };
  img.src = portraitUrl;
  document.fonts?.ready.then(redraw);
  return tex;
}
