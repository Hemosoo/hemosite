import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  H,
  childOffset,
  creases,
  halfRegions,
  polygonGeometry,
  type Crease,
} from "../../../three/cardModel";
import { CUE, seg, span, power2InOut, sineInOut, clamp01, mix } from "../../../three/timeline";
import { FLIGHT_CONFIG as F, TAKEOFF } from "../../../three/flightConfig";
import { useMouseTarget } from "../../../three/useMouseTarget";
import { orientFromDirection } from "../../../three/flightPath";
import { landing } from "./landing";

const smooth = (x: number) => x * x * (3 - 2 * x);

/**
 * Folds stop a little short of a straight 180 so coincident layers keep a
 * sliver of separation; with the per-layer z lift this is what avoids
 * z-fighting where the paper doubles back on itself.
 */
const FLAT = Math.PI * 0.965;
/**
 * Halves swing to ~77 degrees, so the fuselage hangs as a narrow keel.
 *
 * WING_BACK is POSITIVE and nearly equal to it, which looks wrong until you
 * check the axes: the wing crease direction is (-0.09, -0.996), essentially
 * anti-parallel to the centre crease (0, 1). Rotating +phi about -Y is -phi
 * about +Y, so matching signs is what cancels the half's rotation and returns
 * the wing to the horizontal. A negative value folds it further under instead.
 *
 * Solved numerically for maximum span subject to 5-14 degrees of dihedral:
 * gives 2.04 span on a 2.5 card (81%) at 5.1 degrees, with the body hanging
 * 0.32 below the wing plane. The residual dihedral comes from the 5.2 degree
 * skew between the two crease axes; it is free three-dimensionality.
 */
const HALF_CLOSE = 1.35;
const WING_BACK = 1.35;

/** Card lying face-up on the stack: its XY plane laid into world XZ. */
const POSE_DECK: [number, number, number] = [-Math.PI / 2, 0, 0.06];
/** Three-quarter view: both halves, the centre crease and the nose all legible. */
const POSE_FOLD: [number, number, number] = [-0.42, 0.3, -0.06];
/** Turned to show the finished plane off before it leaves. */
/**
 * Kept close to POSE_FOLD. The yaw has shrunk with the hero window each time
 * it was cut — 32 degrees at 0.25s, 21 at 0.16s, 15 here at 0.12s — so the
 * turn stays a readable reveal rather than becoming a flick.
 */
const POSE_HERO: [number, number, number] = [-0.36, 0.56, 0.08];

/**
 * Where the card folds and rests, and how big it is there: measured from the
 * hero's stage box every frame (see CardScene), so the fold sits beside the
 * name at any width.
 */
export interface Stage {
  /** Top of the deck, world space. */
  deckTop: THREE.Vector3;
  /** The deck's scale; the card starts at it, on top of the stack. */
  deckScale: number;
  /** Where the card folds, hovers and comes back to rest. */
  fold: THREE.Vector3;
  /** The card's scale there. */
  cardScale: number;
}

interface PieceProps {
  points: [number, number][];
  lift: number;
  face: THREE.Material;
  back: THREE.Material;
}

/**
 * One flat region, printed on both sides.
 *
 * The reverse is the SAME geometry drawn with side: BackSide — not a copy
 * turned around. `rotation={[0, Math.PI, 0]}` maps (x,y,z) to (-x,y,-z), which
 * mirrors a piece onto the opposite half of the card: a left-half region
 * spanning x in [-1.25, 0] reappears at [0, 1.25]. That gave every region a
 * phantom duplicate across the centreline, which is what made the folded card
 * look like overlapping debris.
 */
function Piece({ points, lift, face, back }: PieceProps) {
  const geo = useMemo(() => polygonGeometry(points, lift), [points, lift]);
  const geoBack = useMemo(() => polygonGeometry(points, lift - 0.004), [points, lift]);
  return (
    <>
      <mesh geometry={geo} material={face} castShadow receiveShadow />
      <mesh geometry={geoBack} material={back} castShadow receiveShadow />
    </>
  );
}

/**
 * A group whose origin sits on a crease, with its child cancelled back into
 * card space so the piece starts exactly where it was cut from.
 *
 * The Euler order is the whole trick. We need
 *
 *     T(p) · Rz(theta) · Rx(phi) · Rz(-theta) · T(-p)
 *
 * which rotates about the crease direction Rz(theta)·X through the point p.
 * Three's default XYZ order composes Rx·Rz, so the child's Rz(-theta) would
 * cancel the pivot's Rz(theta) *before* the fold applied, leaving
 * T(p)·Rx(phi)·T(-p) — every crease folding about world X regardless of its
 * actual angle. ZYX composes Rz·Rx and gives the intended axis.
 */
function Pivot({
  crease,
  refObj,
  children,
}: {
  crease: Crease;
  refObj: React.RefObject<THREE.Group | null>;
  children: React.ReactNode;
}) {
  const off = useMemo(() => childOffset(crease), [crease]);
  useLayoutEffect(() => {
    const g = refObj.current;
    if (!g) return;
    g.rotation.order = "ZYX";
    g.rotation.z = crease.angle;
  }, [crease, refObj]);
  return (
    <group ref={refObj} position={[crease.point[0], crease.point[1], 0]}>
      <group position={off.pos} rotation={[0, 0, off.rotZ]}>
        {children}
      </group>
    </group>
  );
}

interface HalfRefs {
  half: React.RefObject<THREE.Group | null>;
  wing: React.RefObject<THREE.Group | null>;
  nose1: React.RefObject<THREE.Group | null>;
}

function Half({
  sign,
  refs,
  face,
  back,
}: {
  sign: number;
  refs: HalfRefs;
  face: THREE.Material;
  back: THREE.Material;
}) {
  const cr = useMemo(() => creases(sign), [sign]);
  const regions = useMemo(() => halfRegions(sign), [sign]);
  const byId = (k: string) => regions.find((r) => r.id.startsWith(k))!;
  const piece = (k: string) => {
    const r = byId(k);
    return <Piece points={r.points} lift={r.lift} face={face} back={back} />;
  };

  return (
    <Pivot crease={cr.centre} refObj={refs.half}>
      {/* Thin wedge from nose to tail: this becomes the fuselage. */}
      {piece("fuselage")}

      {/* One nose fold, nested in the wing so it travels with it. c1 is also
          the wing's leading edge, so the folded corner tucks exactly along it
          and never breaks the silhouette. */}
      <Pivot crease={cr.wing} refObj={refs.wing}>
        {piece("wing")}
        <Pivot crease={cr.nose1} refObj={refs.nose1}>
          {piece("nose1")}
        </Pivot>
      </Pivot>
    </Pivot>
  );
}

const mkRefs = (): HalfRefs => ({
  half: { current: null },
  wing: { current: null },
  nose1: { current: null },
});

/** When the scripted fold ends and the plane is free. */
const INTRO_END = CUE.hero[1];
/** Seconds without pointer movement before the plane heads back to rest. */
const IDLE_RETURN = 2.4;
/** With no pointer at all (a touch screen, a still mouse): one short flight. */
const SOLO_FLIGHT = 4.5;
/** How long the glide back to rest takes. */
const RETURN_SECONDS = 1.6;

type Mode = "intro" | "fly" | "return" | "rest";

/**
 * The card: drawn from the deck, folded into a plane along its creases, then
 * free to fly while the visitor's pointer moves. When the pointer has been
 * still for a couple of seconds the plane glides back beside the name and
 * stops; nothing draws again until the pointer moves or the page scrolls.
 * Scrolling down flies it to the card in the About section and lands it there.
 */
export default function FoldingCard({
  face,
  back,
  stage,
}: {
  face: THREE.Texture;
  back: THREE.Texture;
  /** Updated in place every frame from the hero's stage box. */
  stage: Stage;
}) {
  const root = useRef<THREE.Group>(null);
  const L = useRef<HalfRefs>(mkRefs()).current;
  const R = useRef<HalfRefs>(mkRefs()).current;
  const { resolve, idleFor, hasPointer } = useMouseTarget();
  const invalidate = useThree((s) => s.invalidate);

  /**
   * Shared by every piece, so the landing can take the light off the whole
   * card at once. The face's corners are cut with alpha to the DOM card's
   * radius; alpha-testing them keeps the card opaque and sorting-free.
   */
  const faceMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: face,
        emissiveMap: face,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0,
        roughness: 0.92,
        metalness: 0,
        side: THREE.FrontSide,
        alphaTest: 0.5,
        // The face has to match the page's card exactly when it lands, and
        // tone mapping would grey its cream stock: the face is shown as
        // printed, the lights only shade it.
        toneMapped: false,
      }),
    [face]
  );
  const backMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: back, roughness: 0.95, metalness: 0, side: THREE.BackSide }),
    [back]
  );
  useEffect(() => () => {
    faceMat.dispose();
    backMat.dispose();
  }, [faceMat, backMat]);

  // Everything mutable lives here: no React state is touched per frame.
  const fx = useRef({
    mode: "intro" as Mode,
    t: 0,
    flyT: 0,
    flying: false,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    speed: 0,
    bank: 0,
    // The glide back to rest.
    rt: 0,
    from: new THREE.Vector3(),
    fromQ: new THREE.Quaternion(),
    c1: new THREE.Vector3(),
    c2: new THREE.Vector3(),
    primed: false,
    zIndex: "",
    /** The last pose in the hero, which the landing starts from. */
    snap: {
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      folds: { sr: 0, nose1: 0, half: 0, wing: 0 },
      scale: 0.3,
      speed: 0.8,
    },
  }).current;

  // The pointer moving again, while the page is at the top, sends the plane
  // back up. Nothing else wakes it.
  useEffect(() => {
    const wake = () => {
      if (fx.mode === "rest" && window.scrollY < 4) {
        fx.mode = "fly";
        fx.flyT = 0;
        fx.flying = false;
      }
      invalidate();
    };
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("scroll", invalidate as () => void, { passive: true });
    window.addEventListener("resize", invalidate as () => void);
    return () => {
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("scroll", invalidate as () => void);
      window.removeEventListener("resize", invalidate as () => void);
    };
  }, [fx, invalidate]);

  // Scratch. Allocating vectors inside useFrame would churn the GC at 60fps.
  const s = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      euler: new THREE.Euler(),
      lifted: new THREE.Vector3(),
      target: new THREE.Vector3(),
      to: new THREE.Vector3(),
      fwd: new THREE.Vector3(),
      axis: new THREE.Vector3(),
      spin: new THREE.Quaternion(),
      want: new THREE.Quaternion(),
      rest: new THREE.Vector3(),
      restQ: new THREE.Quaternion().setFromEuler(new THREE.Euler(...POSE_HERO)),
      tan: new THREE.Vector3(),
      tan2: new THREE.Vector3(),
      qPath: new THREE.Quaternion(),
    }),
    []
  );
  const land = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      scale: 0.5,
      halfW: 2,
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      fwd: new THREE.Vector3(),
      p1: new THREE.Vector3(),
      p2: new THREE.Vector3(),
      tan: new THREE.Vector3(),
      tan2: new THREE.Vector3(),
      qFly: new THREE.Quaternion(),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      c: new THREE.Vector3(),
    }),
    []
  );

  const applyFolds = (f: { sr: number; nose1: number; half: number; wing: number }) => {
    for (const [sign, refs] of [
      [-1, L],
      [1, R],
    ] as const) {
      const d = -sign;
      if (refs.half.current) refs.half.current.rotation.x = d * (f.sr + f.half);
      if (refs.wing.current) refs.wing.current.rotation.x = d * f.wing;
      if (refs.nose1.current) refs.nose1.current.rotation.x = d * f.nose1;
    }
  };

  useFrame(({ clock, camera, gl }, delta) => {
    const g = root.current;
    if (!g) return;
    // A long frame (tab wake, a pause while at rest) must not teleport the physics.
    const dt = Math.min(delta, 1 / 30);
    let more = false;

    // How far the page has scrolled toward the card: 0 in the hero, 1 landed.
    const p = landing.slot ? landing.progress() : 0;
    const u = clamp01((p - 0.01) / 0.99);

    // Over the page while it lands, behind the writing while it's the hero.
    const stageEl = gl.domElement.closest<HTMLElement>("[data-stage]");
    const z = u > 0 ? "30" : "1";
    if (stageEl && fx.zIndex !== z) {
      stageEl.style.zIndex = z;
      fx.zIndex = z;
    }

    // The fold: by the time the intro ends it's a finished plane, and stays one.
    const ft = Math.min(fx.t, INTRO_END);
    const scored = seg(ft, CUE.crease[0], CUE.crease[1], 0, 0.12, sineInOut);
    const relax = 1 - seg(ft, CUE.crease[1], CUE.half[0], 0, 0.6, sineInOut);
    let folds = {
      sr: scored * relax,
      nose1: seg(ft, CUE.nose1[0], CUE.nose1[1], 0, FLAT, power2InOut),
      half: seg(ft, CUE.half[0], CUE.half[1], 0, HALF_CLOSE, power2InOut),
      wing: seg(ft, CUE.wings[0], CUE.wings[1], 0, WING_BACK, power2InOut),
    };
    let scale = stage.cardScale;
    const P = s.pos;
    const Q = s.quat;
    s.rest.set(stage.fold.x + 0.04, stage.fold.y + 0.1, stage.fold.z);

    if (u <= 0 || !fx.primed) {
      if (fx.mode === "intro") {
        // ── deck -> clear air -> folding pose -> hero ───────────────────────
        fx.t += dt;
        const t = fx.t;
        const lift = span(t, CUE.lift[0], CUE.lift[1]);
        const drift = span(t, CUE.drift[0], CUE.drift[1]);
        const eLift = power2InOut(lift);
        const eDrift = sineInOut(drift);
        const peel = Math.sin(lift * Math.PI);
        const dk = stage.deckTop;
        s.lifted.set(dk.x + 0.3, dk.y + 1.25, dk.z + 1.1);
        P.copy(dk).lerp(s.lifted, eLift);
        P.x -= peel * 0.3;
        P.z += peel * 0.55;
        P.lerp(stage.fold, eDrift);
        s.euler.set(
          mix(POSE_DECK[0], POSE_FOLD[0], eDrift) + peel * 0.2,
          mix(POSE_DECK[1], POSE_FOLD[1], eDrift) + peel * 0.28,
          mix(POSE_DECK[2], POSE_FOLD[2], eDrift) - peel * 0.3
        );
        // Turns to show itself off as the wings come out.
        const hero = sineInOut(span(t, CUE.half[1], INTRO_END));
        if (hero > 0) {
          s.euler.set(
            mix(POSE_FOLD[0], POSE_HERO[0], hero),
            mix(POSE_FOLD[1], POSE_HERO[1], hero),
            mix(POSE_FOLD[2], POSE_HERO[2], hero)
          );
          P.lerp(s.rest, hero);
        }
        Q.setFromEuler(s.euler);
        scale = mix(stage.deckScale, stage.cardScale, sineInOut(span(t, CUE.lift[0], CUE.drift[1])));
        fx.pos.copy(P);
        fx.quat.copy(Q);
        if (t >= INTRO_END) {
          fx.mode = "fly";
          fx.flyT = 0;
          fx.flying = false;
        }
        more = true;
      } else if (fx.mode === "fly") {
        // ── takeoff -> following the pointer, the original's physics ────────
        if (!fx.flying) {
          fx.flying = true;
          fx.speed = TAKEOFF.startSpeed;
          // Leaves along its own nose, so the first movement continues the pose.
          fx.vel.set(0, 1, 0).applyQuaternion(fx.quat).multiplyScalar(fx.speed);
        }
        fx.flyT += dt;
        const ramp = sineInOut(clamp01(fx.flyT / 0.8));
        const steerScale = mix(TAKEOFF.startSteering, 1, ramp);

        if (resolve(camera, s.target)) {
          // Loiter rather than stall when the cursor has been still.
          if (idleFor() > 1.0) {
            const a = clock.elapsedTime * F.orbitSpeed;
            s.target.x += Math.cos(a) * F.orbitRadius;
            s.target.y += Math.sin(a * 0.8) * F.orbitRadius * 0.55;
          }
        } else {
          // No pointer: a slow figure of eight, once.
          const a = fx.flyT * 0.55;
          s.target.set(Math.sin(a) * 3.1, Math.sin(a * 2) * 1.5 + 0.4, F.targetDepth);
        }

        s.to.subVectors(s.target, fx.pos);
        const dist = s.to.length();
        if (dist > 1e-4) s.to.multiplyScalar(1 / dist);
        s.fwd.copy(fx.vel);
        const speedNow = s.fwd.length();
        if (speedNow > 1e-5) s.fwd.multiplyScalar(1 / speedNow);
        else s.fwd.set(0, 1, 0).applyQuaternion(fx.quat);
        const near = dist < F.deadzone ? dist / F.deadzone : 1;
        const authority = steerScale * near;
        const climb = THREE.MathUtils.clamp(s.to.y, -1, 1) * F.maxPitch;
        const angle = Math.acos(THREE.MathUtils.clamp(s.fwd.dot(s.to), -1, 1));
        let turned = 0;
        if (angle > 1e-4) {
          const maxStep = F.maxTurnRate * authority * dt;
          const step = Math.min(angle, maxStep, angle * F.steeringStrength * dt + maxStep * 0.15);
          s.axis.crossVectors(s.fwd, s.to);
          if (s.axis.lengthSq() > 1e-8) {
            s.axis.normalize();
            s.spin.setFromAxisAngle(s.axis, step);
            s.fwd.applyQuaternion(s.spin);
            turned = (step / Math.max(dt, 1e-4)) * Math.sign(-s.axis.y);
          }
        }
        s.fwd.y += climb * dt * 2.2;
        s.fwd.normalize();
        const cap = mix(TAKEOFF.startSpeed, F.maxSpeed, ramp);
        const wanted = Math.min(
          THREE.MathUtils.clamp(F.minSpeed + (F.maxSpeed - F.minSpeed) * clamp01(dist / 4), F.minSpeed, F.maxSpeed),
          cap
        );
        fx.speed += (wanted - fx.speed) * Math.min(1, F.acceleration * dt);
        fx.vel.copy(s.fwd).multiplyScalar(fx.speed);
        fx.pos.addScaledVector(fx.vel, dt);
        const wantBank = THREE.MathUtils.clamp(turned * F.bankGain, -F.maxBankAngle, F.maxBankAngle);
        fx.bank += (wantBank - fx.bank) * Math.min(1, F.bankResponse * dt);
        orientFromDirection(s.want, s.fwd, fx.bank);
        const rate = mix(TAKEOFF.startOrientRate, F.orientRate, ramp);
        fx.quat.slerp(s.want, Math.min(1, rate * dt)).normalize();
        P.copy(fx.pos);
        Q.copy(fx.quat);

        // Still for a moment (or never touched): head back and rest.
        const still = hasPointer() ? idleFor() > IDLE_RETURN && fx.flyT > 1.2 : fx.flyT > SOLO_FLIGHT;
        if (still) {
          fx.mode = "return";
          fx.rt = 0;
          fx.from.copy(fx.pos);
          fx.fromQ.copy(fx.quat);
          // Carry on along its heading, then come in to the rest point along
          // the rest pose's own nose, so it arrives the way it's facing.
          fx.c1.copy(fx.pos).addScaledVector(s.fwd, Math.min(1.4, 0.35 + fx.speed * 0.35));
          s.tan.set(0, 1, 0).applyQuaternion(s.restQ);
          fx.c2.copy(s.rest).addScaledVector(s.tan, -1.1);
        }
        more = true;
      } else if (fx.mode === "return") {
        // ── gliding back beside the name, slowing to a stop ─────────────────
        fx.rt += dt;
        const k = clamp01(fx.rt / RETURN_SECONDS);
        const e = 1 - Math.pow(1 - k, 2.4);
        bezier(P, fx.from, fx.c1, fx.c2, s.rest, e);
        bezierTangent(s.tan, fx.from, fx.c1, fx.c2, s.rest, Math.min(e, 0.999), land);
        if (s.tan.lengthSq() > 1e-8) orientFromDirection(s.qPath, s.tan.normalize(), 0);
        Q.copy(fx.fromQ).slerp(s.qPath, smooth(span(k, 0, 0.25)));
        Q.slerp(s.restQ, smooth(span(k, 0.5, 1)));
        fx.pos.copy(P);
        fx.quat.copy(Q);
        if (k >= 1) {
          fx.mode = "rest";
          fx.flying = false;
          fx.speed = 0;
          fx.vel.set(0, 0, 0);
        } else more = true;
      } else {
        // ── at rest: still, and nothing draws until something changes ──────
        P.copy(s.rest);
        Q.copy(s.restQ);
        fx.pos.copy(P);
        fx.quat.copy(Q);
      }

      const sn = fx.snap;
      sn.pos.copy(P);
      sn.quat.copy(Q);
      sn.folds = folds;
      sn.scale = scale;
      sn.speed = fx.mode === "fly" ? fx.speed : 0.8;
      fx.primed = true;
    }

    let k = 0;
    if (u > 0) {
      // ── the landing: home to the card in the About section ──────────────
      const cam = camera as THREE.PerspectiveCamera;
      const sn = fx.snap;
      land.right.set(1, 0, 0).applyQuaternion(cam.quaternion);
      land.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
      land.fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
      const r = landing.slot!.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tanY = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const tanX = tanY * cam.aspect;
      const ratio = r.height / vh;
      // Far enough that the card is the size it flies at, so the landing is a
      // change of shape, not a sudden zoom.
      const D = THREE.MathUtils.clamp((stage.cardScale * H) / (ratio * 2 * tanY), 2.5, 9);
      const nx = ((r.left + r.width / 2) / vw) * 2 - 1;
      const ny = -(((r.top + r.height / 2) / vh) * 2 - 1);
      land.pos
        .copy(cam.position)
        .addScaledVector(land.fwd, D)
        .addScaledVector(land.right, nx * tanX * D)
        .addScaledVector(land.up, ny * tanY * D);
      land.scale = (ratio * 2 * tanY * D) / H;
      land.quat.copy(cam.quaternion);
      land.halfW = tanX * D;
      // The model's centre sits 0.16H below its origin (the nose is the pivot).
      land.pos.addScaledVector(land.up, 0.16 * H * land.scale);

      // The way down: carry on along the nose, swing out to the side of the
      // card, and come in to it, slowing all the way.
      s.fwd.set(0, 1, 0).applyQuaternion(sn.quat);
      land.p1.copy(sn.pos).addScaledVector(s.fwd, 1.2 + sn.speed * 0.5);
      land.p2
        .copy(land.pos)
        .addScaledVector(land.right, Math.min(2.4, land.halfW * 0.6))
        .addScaledVector(land.up, 0.7)
        .addScaledVector(land.fwd, -0.4);
      const e = 1 - Math.pow(1 - clamp01(u / 0.9), 2.2);
      bezier(P, sn.pos, land.p1, land.p2, land.pos, e);
      bezierTangent(land.tan, sn.pos, land.p1, land.p2, land.pos, Math.min(e, 0.999), land);
      bezierTangent(land.tan2, sn.pos, land.p1, land.p2, land.pos, Math.min(e + 0.04, 1), land);
      if (land.tan.lengthSq() < 1e-8) land.tan.copy(s.fwd);
      land.tan.normalize();
      land.tan2.normalize();
      s.axis.crossVectors(land.tan, land.tan2);
      const turn = Math.asin(THREE.MathUtils.clamp(s.axis.length(), 0, 1)) * Math.sign(-s.axis.y || 1);
      const settle = smooth(span(u, 0.45, 0.85));
      const bank = THREE.MathUtils.clamp(turn * 9, -0.75, 0.75) * (1 - settle);
      orientFromDirection(land.qFly, land.tan, bank);
      Q.copy(sn.quat).slerp(land.qFly, smooth(span(u, 0, 0.14)));
      // Turn to face the reader as it opens.
      Q.slerp(land.quat, smooth(span(u, 0.5, 0.9)));

      // Unfold: the fold in reverse. Wings first, then the body, then the nose.
      const sf = sn.folds;
      const wingK = 1 - smooth(span(u, 0.48, 0.68));
      const halfK = 1 - smooth(span(u, 0.56, 0.8));
      const noseK = 1 - smooth(span(u, 0.7, 0.9));
      folds = { sr: sf.sr * halfK, half: sf.half * halfK, wing: sf.wing * wingK, nose1: sf.nose1 * noseK };
      scale = mix(sn.scale, land.scale, smooth(span(u, 0.1, 0.9)));
      // The light fades off it as it lands, leaving the print as it is, so
      // it matches the DOM card it is about to become.
      k = smooth(span(u, 0.62, 0.92));
      if (u < 0.995) landing.unflip?.();
    }

    applyFolds(folds);
    g.position.copy(P);
    g.quaternion.copy(Q);
    g.scale.setScalar(Math.max(scale, 0.0001));
    faceMat.color.setScalar(1 - k);
    faceMat.emissiveIntensity = k;

    // The hand-over: the DOM card fades in over its exact double.
    if (landing.slot) landing.show(smooth(span(u, 0.93, 1)));
    if (more) invalidate();
  });

  return (
    <group ref={root}>
      {/* Shift so the nose, not the centre, is near the group origin: the
          flight path then orients about the point the eye tracks. */}
      <group position={[0, -H * 0.16, 0]}>
        <Half sign={-1} refs={L} face={faceMat} back={backMat} />
        <Half sign={1} refs={R} face={faceMat} back={backMat} />
      </group>
    </group>
  );
}

/** A point on the cubic Bézier p0..p3. */
function bezier(
  out: THREE.Vector3,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number
) {
  const i = 1 - t;
  return out
    .set(0, 0, 0)
    .addScaledVector(p0, i * i * i)
    .addScaledVector(p1, 3 * i * i * t)
    .addScaledVector(p2, 3 * i * t * t)
    .addScaledVector(p3, t * t * t);
}

/** Its tangent at t. */
function bezierTangent(
  out: THREE.Vector3,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
  scratch: { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3 }
) {
  const i = 1 - t;
  return out
    .set(0, 0, 0)
    .addScaledVector(scratch.c.copy(p1).sub(p0), 3 * i * i)
    .addScaledVector(scratch.b.copy(p2).sub(p1), 6 * i * t)
    .addScaledVector(scratch.a.copy(p3).sub(p2), 3 * t * t);
}
