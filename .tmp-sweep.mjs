import * as THREE from "three";
import { W, halfRegions, creases, childOffset } from "./.tmp-cm.mjs";
const FLAT = Math.PI * 0.965;
function build(sign, hc, wb) {
  const cr = creases(sign), d = -sign;
  const mk = (c, rotX) => {
    const p = new THREE.Object3D();
    p.position.set(c.point[0], c.point[1], 0);
    p.rotation.order = "ZYX"; p.rotation.z = c.angle; p.rotation.x = rotX;
    const off = childOffset(c);
    const i = new THREE.Object3D();
    i.position.set(...off.pos); i.rotation.z = off.rotZ; p.add(i); return [p, i];
  };
  const [half, halfIn] = mk(cr.centre, d*hc);
  const [wing, wingIn] = mk(cr.wing, d*wb);
  const [n2, n2In] = mk(cr.nose2, d*FLAT);
  const [n1, n1In] = mk(cr.nose1, d*FLAT);
  halfIn.add(wing); wingIn.add(n2); n2In.add(n1);
  half.updateWorldMatrix(true, true);
  const hosts = { fuselage: halfIn, wing: wingIn, nose2: n2In, nose1: n1In };
  const out = {};
  for (const r of halfRegions(sign)) { const k=r.id.replace(/[LR]$/,""); out[k]=r.points.map(([x,y])=>hosts[k].localToWorld(new THREE.Vector3(x,y,0))); }
  return out;
}
function metrics(hc, wb) {
  const L = build(-1,hc,wb), R = build(1,hc,wb);
  const all = [...Object.values(L),...Object.values(R)].flat();
  const span = Math.max(...all.map(p=>Math.abs(p.x)))*2;
  const [a,b,c] = L.wing;
  const nrm = new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize();
  const dihedral = Math.abs(90 - Math.acos(Math.abs(nrm.z))*180/Math.PI);
  // Which way does the wing tip sit relative to the fuselage? positive = above.
  const tip = L.wing.reduce((m,p)=>Math.abs(p.x)>Math.abs(m.x)?p:m, L.wing[0]);
  const fuseZ = Math.min(...[...L.fuselage,...R.fuselage].map(p=>p.z));
  return { span, dihedral, tipZ: tip.z, fuseZ, drop: tip.z - fuseZ };
}
console.log("  HALF  WING   span  dihedral  tipZ   fuseZ   wing-above-body");
let best=null;
for (const hc of [1.85, 2.0, 2.15, 2.3, 2.45]) {
  for (const wb of [1.5,1.7,1.85,2.0,2.15,2.3,2.45]) {
    const m = metrics(hc,wb);
    const ok = m.span > W*0.9 && m.dihedral < 16 && m.drop > 0.35;
    if (ok && (!best || m.span > best.m.span)) best={hc,wb,m};
    console.log(`  ${hc.toFixed(2)}  ${wb.toFixed(2)}  ${m.span.toFixed(3)} ${m.dihedral.toFixed(1).padStart(7)}  ${m.tipZ.toFixed(2).padStart(5)}  ${m.fuseZ.toFixed(2).padStart(5)}   ${m.drop.toFixed(2).padStart(5)}${ok?"  <- ok":""}`);
  }
}
console.log(best ? `\n  BEST  HALF_CLOSE=${best.hc}  WING_BACK=${best.wb}  span=${best.m.span.toFixed(3)} (card ${W})  dihedral=${best.m.dihedral.toFixed(1)} deg  body hangs ${best.m.drop.toFixed(2)}` : "\n  none met targets");
