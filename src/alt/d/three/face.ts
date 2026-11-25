import * as THREE from "three";

/**
 * The 3D card's two sides.
 *
 * The face is drawn from the page's own card: every position, size, colour
 * and font is read from the DOM card's front at draw time (the photograph's
 * box, the printed name and "Penn ’27"), so when the flat 3D card lands on the
 * DOM card and cross-fades into it nothing moves or changes. The corners are
 * cut with alpha to the DOM card's radius; the material alpha-tests them.
 *
 * The texture is returned at once and redrawn when the portrait and fonts
 * arrive, so the scene never waits on an image.
 */
const TW = 1000;
const TH = 1400;

function finish(c: HTMLCanvasElement, aniso: number) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

export function makeFaceTexture(card: HTMLElement | null, portraitUrl: string, aniso = 4) {
  const c = document.createElement("canvas");
  c.width = TW;
  c.height = TH;
  const x = c.getContext("2d")!;
  const img = new Image();
  img.decoding = "async";

  const draw = () => {
    x.clearRect(0, 0, TW, TH);
    const front = card?.querySelector<HTMLElement>(".a-front");
    const fr = front?.getBoundingClientRect();
    // Before the page has laid the card out, a plain stock card.
    const k = fr && fr.width ? TW / fr.width : 1;
    const px = (v: number) => v * k;
    const cs = front ? getComputedStyle(front) : null;
    const radius = cs ? parseFloat(cs.borderTopLeftRadius) || 0 : 30;

    x.save();
    x.beginPath();
    x.roundRect(0, 0, TW, TH, px(radius));
    x.clip();
    x.fillStyle = cs?.backgroundColor || "#ece6d9";
    x.fillRect(0, 0, TW, TH);

    if (front && fr) {
      const at = (el: Element | null) => {
        const r = el?.getBoundingClientRect();
        return r ? { l: px(r.left - fr.left), t: px(r.top - fr.top), w: px(r.width), h: px(r.height) } : null;
      };

      // The photograph, as object-fit: cover at 50% 30%.
      const photoEl = front.querySelector<HTMLElement>(".a-photo");
      const p = at(photoEl);
      if (p && photoEl) {
        const pr = px(parseFloat(getComputedStyle(photoEl).borderTopLeftRadius) || 0);
        x.save();
        x.beginPath();
        x.roundRect(p.l, p.t, p.w, p.h, pr);
        x.clip();
        x.fillStyle = getComputedStyle(photoEl).backgroundColor || "#2a2723";
        x.fillRect(p.l, p.t, p.w, p.h);
        if (img.complete && img.naturalWidth) {
          const s = Math.max(p.w / img.naturalWidth, p.h / img.naturalHeight);
          const dw = img.naturalWidth * s;
          const dh = img.naturalHeight * s;
          x.drawImage(img, p.l + (p.w - dw) * 0.5, p.t + (p.h - dh) * 0.3, dw, dh);
        }
        x.restore();
      }

      // The two printed lines, set where CSS sets them: baseline from the
      // line box, the way the browser does it.
      for (const sel of [".a-print-name", ".a-print-meta"]) {
        const el = front.querySelector<HTMLElement>(sel);
        const b = at(el);
        if (!el || !b) continue;
        const st = getComputedStyle(el);
        const size = px(parseFloat(st.fontSize));
        x.font = `${st.fontWeight} ${size}px ${st.fontFamily}`;
        x.letterSpacing = `${px(parseFloat(st.letterSpacing) || 0)}px`;
        x.fillStyle = st.color;
        x.textBaseline = "alphabetic";
        const m = x.measureText(el.textContent ?? "");
        const asc = m.fontBoundingBoxAscent;
        const desc = m.fontBoundingBoxDescent;
        const base = b.t + (b.h - (asc + desc)) / 2 + asc;
        x.fillText(el.textContent ?? "", b.l, base);
        x.letterSpacing = "0px";
      }
    }
    x.restore();
    tex.needsUpdate = true;
  };

  const tex = finish(c, aniso);
  draw();
  img.onload = () => {
    if (document.fonts) document.fonts.ready.then(draw);
    else draw();
  };
  img.src = portraitUrl;
  document.fonts?.ready.then(draw);
  return Object.assign(tex, { redraw: draw });
}

/**
 * The back of every card in the deck: the page's dark ground, a cream border
 * like the card stock, and a fine warm lattice. The deck reads as the same
 * set as the card without bringing a new colour onto the page.
 */
export function makeBackTexture(aniso = 4) {
  const W = 512;
  const H = Math.round((W * 3.5) / 2.5);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ece6d9";
  x.fillRect(0, 0, W, H);
  x.fillStyle = "#1a1815";
  x.fillRect(18, 18, W - 36, H - 36);
  x.save();
  x.beginPath();
  x.rect(18, 18, W - 36, H - 36);
  x.clip();
  x.strokeStyle = "rgba(214,180,119,0.22)";
  x.lineWidth = 2;
  for (let i = -H; i < W + H; i += 26) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + H, H);
    x.stroke();
    x.beginPath();
    x.moveTo(i, H);
    x.lineTo(i + H, 0);
    x.stroke();
  }
  x.restore();
  x.strokeStyle = "rgba(214,180,119,0.45)";
  x.lineWidth = 2;
  x.strokeRect(30, 30, W - 60, H - 60);
  return finish(c, aniso);
}
