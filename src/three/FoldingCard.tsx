import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  H,
  childOffset,
  creases,
  halfRegions,
  polygonGeometry,
  type Crease,
} from "./cardModel";
import { CUE, LOOP_SECONDS, seg, span, power2InOut, sineInOut, clamp01, mix } from "./timeline";
import { FLIGHT_CONFIG as F, TAKEOFF } from "./flightConfig";
import { useMouseTarget } from "./useMouseTarget";
import { orientFromDirection } from "./flightPath";
import { landing } from "./landing";

const smooth = (x: number) => x * x * (3 - 2 * x);

/**
 * Freeze the fold at a fraction of its sequence, for inspecting geometry.
 * null = run normally. Checkpoints:
 *   0.00  flat card, floating clear of the deck
 *   0.18  centre crease scored
 *   0.45  triangular nose formed
 *   0.70  body folded down the centre
 *   1.00  wings out — finished aeroplane
 */
const DEBUG_FOLD_PROGRESS: number | null = null;

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
 * Size and place of the folded card.
 *
 * At scale 1 and z = 2.6 the card stood 3.57 units tall in a 4.75-unit
 * viewport — 75% of the frame, sprawling across the wordmark. The earlier
 * tuning optimised the deck-to-card growth *ratio* and never checked absolute
 * size against the view frustum, which is how that got through.
 *
 * 0.44 at z = 1.8 puts it at 30% of frame height, and x = -2.9 keeps its
 * 0.90-unit span inside [-3.35, -2.45] against a left edge of -4.24: clear of
 * the centre, where the name lives.
 */
const CARD_SCALE = 0.56;
const FOLD_POS = new THREE.Vector3(-2.9, -0.5, 1.8);

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

export default function FoldingCard({
  face,
  back,
  deckTop,
  startScale,
}: {
  face: THREE.Texture;
  back: THREE.Texture;
  /** Updated in place as the deck scrolls away with the hero. */
  deckTop: THREE.Vector3;
  /** Matches the deck, so at rest the card is indistinguishable from it. */
  startScale: number;
}) {
  const root = useRef<THREE.Group>(null);
  const L = useRef<HalfRefs>(mkRefs()).current;
  const R = useRef<HalfRefs>(mkRefs()).current;
  const { resolve, idleFor } = useMouseTarget();

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
    flying: false,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    speed: 0,
    bank: 0,
    /** Set once when the exit begins, from the heading at that moment. */
    exitAimed: false,
    exitTarget: new THREE.Vector3(),
    opacity: 1,
  }).current;

  /**
   * The hero loop keeps its own clock, so the landing can hold it and
   * scrolling back up resumes it exactly where the plane left off.
   */
  const loop = useRef({
    t: 0,
    primed: false,
    /** The loop's last pose, which the landing starts from. */
    snap: {
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      folds: { sr: 0, nose1: 0, half: 0, wing: 0 },
      vis: 1,
      scale: startScale,
      speed: 0.8,
    },
    zIndex: "",
  }).current;

  /** Last opacity pushed to the materials, so we only walk the tree on change. */
  const opacityRef = useRef(1);

  // Scratch. Allocating vectors inside useFrame would churn the GC at 60fps.
  const _pos = useMemo(() => new THREE.Vector3(), []);
  const _quat = useMemo(() => new THREE.Quaternion(), []);
  const _pose = useMemo(() => new THREE.Quaternion(), []);
  const _euler = useMemo(() => new THREE.Euler(), []);
  const _lifted = useMemo(() => new THREE.Vector3(), []);
  const _target = useMemo(() => new THREE.Vector3(), []);
  const _toTarget = useMemo(() => new THREE.Vector3(), []);
  const _fwd = useMemo(() => new THREE.Vector3(), []);
  const _axis = useMemo(() => new THREE.Vector3(), []);
  const _spin = useMemo(() => new THREE.Quaternion(), []);
  const _want = useMemo(() => new THREE.Quaternion(), []);
  // Landing scratch.
  const land = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      scale: CARD_SCALE,
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
    // A long frame (tab wake, GC pause) must not teleport the physics.
    const dt = Math.min(delta, 1 / 30);

    // How far the page has scrolled toward the player card: 0 in the hero,
    // 1 landed (the Gate stops rendering from there).
    const p = landing.slot ? landing.progress() : 0;
    const u = clamp01((p - 0.01) / 0.99);

    // Over the page while it lands, behind the name while it is the hero.
    const stage = gl.domElement.closest<HTMLElement>("[data-stage]");
    const z = u > 0 ? "30" : "1";
    if (stage && loop.zIndex !== z) {
      stage.style.zIndex = z;
      loop.zIndex = z;
    }

    let folds = loop.snap.folds;
    let vis = 1;
    let scale = startScale;

    if (u <= 0 || !loop.primed) {
      // ── the hero: the loop, untouched ───────────────────────────────────
      loop.t = (loop.t + dt) % LOOP_SECONDS;
      const t =
        DEBUG_FOLD_PROGRESS == null
          ? loop.t
          : CUE.crease[0] + (CUE.wings[1] - CUE.crease[0]) * DEBUG_FOLD_PROGRESS;

      const scored = seg(t, CUE.crease[0], CUE.crease[1], 0, 0.12, sineInOut);
      const relax = 1 - seg(t, CUE.crease[1], CUE.half[0], 0, 0.6, sineInOut);
      folds = {
        sr: scored * relax,
        nose1: seg(t, CUE.nose1[0], CUE.nose1[1], 0, FLAT, power2InOut),
        half: seg(t, CUE.half[0], CUE.half[1], 0, HALF_CLOSE, power2InOut),
        wing: seg(t, CUE.wings[0], CUE.wings[1], 0, WING_BACK, power2InOut),
      };

      const scripted = t < CUE.takeoff[0];

      if (scripted) {
        // ── deck -> clear air -> folding pose -> hero ───────────────────────
        const lift = span(t, CUE.lift[0], CUE.lift[1]);
        const drift = span(t, CUE.drift[0], CUE.drift[1]);
        const eLift = power2InOut(lift);
        const eDrift = sineInOut(drift);
        const peel = Math.sin(lift * Math.PI);

        _lifted.set(deckTop.x + 0.3, deckTop.y + 1.25, deckTop.z + 1.1);
        _pos.copy(deckTop).lerp(_lifted, eLift);
        _pos.x -= peel * 0.3;
        _pos.z += peel * 0.55;
        _pos.lerp(FOLD_POS, eDrift);

        _euler.set(
          THREE.MathUtils.lerp(POSE_DECK[0], POSE_FOLD[0], eDrift) + peel * 0.2,
          THREE.MathUtils.lerp(POSE_DECK[1], POSE_FOLD[1], eDrift) + peel * 0.28,
          THREE.MathUtils.lerp(POSE_DECK[2], POSE_FOLD[2], eDrift) - peel * 0.3
        );

        // Hero: turns to show itself off, and keeps breathing rather than
        // freezing — a dead-still pose is what made it read as a pause.
        const hero = sineInOut(span(t, CUE.hero[0], CUE.hero[1]));
        if (hero > 0) {
          const hover = Math.sin(t * 3.1) * 0.035;
          _euler.set(
            THREE.MathUtils.lerp(POSE_FOLD[0], POSE_HERO[0], hero) + hover * 0.5,
            THREE.MathUtils.lerp(POSE_FOLD[1], POSE_HERO[1], hero),
            THREE.MathUtils.lerp(POSE_FOLD[2], POSE_HERO[2], hero) + hover
          );
          _pos.y += hero * 0.1 + hover * 0.6;
          _pos.x += hero * 0.04;
        }
        _pose.setFromEuler(_euler);
        _quat.copy(_pose);

        // Mirror into the physics state every frame, so takeoff inherits the
        // exact pose with nothing to hand over.
        fx.pos.copy(_pos);
        fx.quat.copy(_quat);
        fx.flying = false;
        fx.exitAimed = false;
        fx.opacity = 1;
      } else {
        // ── takeoff -> cursor chase -> exit, all one integration ───────────
        if (!fx.flying) {
          fx.flying = true;
          fx.speed = TAKEOFF.startSpeed;
          // Leaves along its own nose, so the first movement continues the pose.
          fx.vel.set(0, 1, 0).applyQuaternion(fx.quat).multiplyScalar(fx.speed);
        }

        const takeoff = clamp01(span(t, CUE.takeoff[0], CUE.takeoff[1]));
        const ramp = sineInOut(takeoff);
        const exiting = t >= CUE.exit[0];
        const exitP = clamp01(span(t, CUE.exit[0], CUE.exit[1]));

        // Where it wants to go.
        let steerScale = THREE.MathUtils.lerp(TAKEOFF.startSteering, 1, ramp);
        if (exiting) {
          if (!fx.exitAimed) {
            fx.exitAimed = true;
            // Commit to wherever it was already heading, so leaving looks like a
            // continuation rather than a new instruction.
            _fwd.copy(fx.vel).normalize();
            fx.exitTarget
              .copy(fx.pos)
              .addScaledVector(_fwd, 26)
              .setY(fx.pos.y + _fwd.y * 12 + 1.2);
            fx.exitTarget.z -= 8;
          }
          _target.copy(fx.exitTarget);
          // Stop taking cursor input, but keep enough authority to curve away.
          steerScale *= THREE.MathUtils.lerp(1, 0.25, clamp01(exitP * 2));
        } else if (resolve(camera, _target)) {
          // Loiter rather than stall when the cursor has been still.
          if (idleFor() > 1.4) {
            const a = clock.elapsedTime * F.orbitSpeed;
            _target.x += Math.cos(a) * F.orbitRadius;
            _target.y += Math.sin(a * 0.8) * F.orbitRadius * 0.55;
          }
        } else {
          // No pointer (touch, or nothing moved yet): fly a slow figure of eight.
          const a = clock.elapsedTime * 0.55;
          _target.set(Math.sin(a) * 3.1, Math.sin(a * 2) * 1.5 + 0.4, F.targetDepth);
        }

        // ── steering ───────────────────────────────────────────────────────
        _toTarget.subVectors(_target, fx.pos);
        const dist = _toTarget.length();
        if (dist > 1e-4) _toTarget.multiplyScalar(1 / dist);
        _fwd.copy(fx.vel);
        const speedNow = _fwd.length();
        if (speedNow > 1e-5) _fwd.multiplyScalar(1 / speedNow);
        else _fwd.set(0, 1, 0).applyQuaternion(fx.quat);

        // Inside the deadzone, ease off so it sails past and curves back rather
        // than jittering on the cursor.
        const near = dist < F.deadzone ? dist / F.deadzone : 1;
        const authority = steerScale * near;

        // Pitch bias: nose follows the target up or down, gently.
        const climb = THREE.MathUtils.clamp(_toTarget.y, -1, 1) * F.maxPitch;

        // Rotate the heading toward the target, capped by the turn rate — this
        // is the turning radius, and why a fast cursor flick produces a wide arc
        // instead of an instant reversal.
        const cosA = THREE.MathUtils.clamp(_fwd.dot(_toTarget), -1, 1);
        const angle = Math.acos(cosA);
        let turned = 0;
        if (angle > 1e-4) {
          const maxStep = F.maxTurnRate * authority * dt;
          const step = Math.min(angle, maxStep, angle * F.steeringStrength * dt + maxStep * 0.15);
          _axis.crossVectors(_fwd, _toTarget);
          if (_axis.lengthSq() > 1e-8) {
            _axis.normalize();
            _spin.setFromAxisAngle(_axis, step);
            _fwd.applyQuaternion(_spin);
            // Sign of the turn about world up decides which way it rolls.
            turned = (step / Math.max(dt, 1e-4)) * Math.sign(-_axis.y);
          }
        }
        _fwd.y += climb * dt * 2.2;
        _fwd.normalize();

        // ── speed ──────────────────────────────────────────────────────────
        const cap = THREE.MathUtils.lerp(TAKEOFF.startSpeed, F.maxSpeed, ramp);
        let wanted = THREE.MathUtils.clamp(
          F.minSpeed + (F.maxSpeed - F.minSpeed) * clamp01(dist / 4),
          F.minSpeed,
          F.maxSpeed
        );
        if (exiting) wanted = F.maxSpeed * F.exitSpeedBoost;
        wanted = Math.min(wanted, exiting ? Infinity : cap);
        fx.speed += (wanted - fx.speed) * Math.min(1, F.acceleration * dt);
        fx.vel.copy(_fwd).multiplyScalar(fx.speed);
        fx.pos.addScaledVector(fx.vel, dt);

        // ── bank ───────────────────────────────────────────────────────────
        const wantBank = THREE.MathUtils.clamp(
          turned * F.bankGain,
          -F.maxBankAngle,
          F.maxBankAngle
        );
        fx.bank += (wantBank - fx.bank) * Math.min(1, F.bankResponse * dt);

        // ── orientation ────────────────────────────────────────────────────
        orientFromDirection(_want, _fwd, fx.bank);
        // Slerp, never assign: the rate ramps up through takeoff so the pose
        // dissolves into the flight attitude instead of snapping to it.
        const rate = THREE.MathUtils.lerp(TAKEOFF.startOrientRate, F.orientRate, ramp);
        fx.quat.slerp(_want, Math.min(1, rate * dt)).normalize();

        _pos.copy(fx.pos);
        _quat.copy(fx.quat);

        // Fade only once it is mostly gone.
        fx.opacity = exiting ? 1 - clamp01((exitP - F.exitFadeFrom) / (1 - F.exitFadeFrom)) : 1;
      }

      // Reappear on the deck only while invisible.
      const enter = span(t, CUE.reset[1] - 0.22, CUE.reset[1]);
      vis = DEBUG_FOLD_PROGRESS == null ? Math.max(fx.opacity, enter) : 1;
      const grow = THREE.MathUtils.lerp(startScale, CARD_SCALE, sineInOut(span(t, CUE.lift[0], CUE.drift[1])));
      scale = grow * THREE.MathUtils.clamp(0.35 + vis * 0.65, 0.001, 1);

      // The snapshot the landing starts from, so leaving and coming back are
      // seamless.
      const sn = loop.snap;
      sn.pos.copy(_pos);
      sn.quat.copy(_quat);
      sn.folds = folds;
      sn.vis = vis;
      sn.scale = scale;
      sn.speed = fx.flying ? fx.speed : 0.8;
      loop.primed = true;
    }

    let k = 0;
    let visible = vis > 0.02;
    if (u > 0) {
      // ── the landing: home to the player card ────────────────────────────
      const cam = camera as THREE.PerspectiveCamera;
      const sn = loop.snap;
      land.right.set(1, 0, 0).applyQuaternion(cam.quaternion);
      land.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
      land.fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);

      // Where the DOM card is this frame, in the scene: it rises with the
      // page and, on a wide screen, sticks exactly when the landing ends.
      const r = landing.slot!.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tanY = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const tanX = tanY * cam.aspect;
      const ratio = r.height / vh;
      // Far enough that the card is the size it flies at, so the landing is a
      // change of shape, not a sudden zoom.
      const D = THREE.MathUtils.clamp((CARD_SCALE * H) / (ratio * 2 * tanY), 2.5, 9);
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

      // The way home: carry on along the nose, swing out to the right of the
      // slot, and glide left into it, slowing all the way.
      _fwd.set(0, 1, 0).applyQuaternion(sn.quat);
      land.p1.copy(sn.pos).addScaledVector(_fwd, 1.2 + sn.speed * 0.5);
      land.p2
        .copy(land.pos)
        .addScaledVector(land.right, Math.min(2.4, land.halfW * 0.6))
        .addScaledVector(land.up, 0.7)
        .addScaledVector(land.fwd, -0.4);
      const s = 1 - Math.pow(1 - clamp01(u / 0.9), 2.2);
      bezier(_pos, sn.pos, land.p1, land.p2, land.pos, s);
      bezierTangent(land.tan, sn.pos, land.p1, land.p2, land.pos, Math.min(s, 0.999), land);
      bezierTangent(land.tan2, sn.pos, land.p1, land.p2, land.pos, Math.min(s + 0.04, 1), land);
      if (land.tan.lengthSq() < 1e-8) land.tan.copy(_fwd);
      land.tan.normalize();
      land.tan2.normalize();
      // Bank into the turn the path is making, and level out to land.
      _axis.crossVectors(land.tan, land.tan2);
      const turn = Math.asin(THREE.MathUtils.clamp(_axis.length(), 0, 1)) * Math.sign(-_axis.y || 1);
      const settle = smooth(span(u, 0.45, 0.85));
      const bank = THREE.MathUtils.clamp(turn * 9, -0.75, 0.75) * (1 - settle);
      orientFromDirection(land.qFly, land.tan, bank);
      _quat.copy(sn.quat).slerp(land.qFly, smooth(span(u, 0, 0.14)));
      // Turn to face the reader as it opens.
      _quat.slerp(land.quat, smooth(span(u, 0.5, 0.9)));

      // Unfold: the fold in reverse. Wings first, then the body, then the nose.
      const sf = sn.folds;
      const wingK = 1 - smooth(span(u, 0.48, 0.68));
      const halfK = 1 - smooth(span(u, 0.56, 0.8));
      const noseK = 1 - smooth(span(u, 0.7, 0.9));
      folds = { sr: sf.sr * halfK, half: sf.half * halfK, wing: sf.wing * wingK, nose1: sf.nose1 * noseK };
      scale = mix(sn.scale, land.scale, smooth(span(u, 0.1, 0.9)));
      visible = sn.vis > 0.02 || u > 0.03;
      // Caught mid-reset, between exit and the deck: it appears from nothing.
      if (sn.vis <= 0.02) scale *= smooth(span(u, 0, 0.2));
      vis = 1;
      // The light fades off it as it lands, leaving the print as it is, so
      // it matches the DOM card it is about to become.
      k = smooth(span(u, 0.62, 0.92));
      if (u < 0.995) landing.unflip?.();
    }

    applyFolds(folds);
    g.position.copy(_pos);
    g.quaternion.copy(_quat);
    g.visible = visible;
    g.scale.setScalar(Math.max(scale, 0.0001));
    faceMat.color.setScalar(1 - k);
    faceMat.emissiveIntensity = k;

    if (opacityRef.current !== vis) {
      opacityRef.current = vis;
      faceMat.opacity = backMat.opacity = vis;
    }

    // The hand-over: the DOM card fades in over its exact double.
    if (landing.slot) landing.show(smooth(span(u, 0.93, 1)));
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
  s: number
) {
  const i = 1 - s;
  return out
    .set(0, 0, 0)
    .addScaledVector(p0, i * i * i)
    .addScaledVector(p1, 3 * i * i * s)
    .addScaledVector(p2, 3 * i * s * s)
    .addScaledVector(p3, s * s * s);
}

/** Its tangent at s. */
function bezierTangent(
  out: THREE.Vector3,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  s: number,
  scratch: { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3 }
) {
  const i = 1 - s;
  return out
    .set(0, 0, 0)
    .addScaledVector(scratch.c.copy(p1).sub(p0), 3 * i * i)
    .addScaledVector(scratch.b.copy(p2).sub(p1), 6 * i * s)
    .addScaledVector(scratch.a.copy(p3).sub(p2), 3 * s * s);
}
