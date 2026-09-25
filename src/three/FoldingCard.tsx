import { useLayoutEffect, useMemo, useRef } from "react";
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
import { CUE, LOOP_SECONDS, seg, span, power2InOut, power3Out, sineInOut } from "./timeline";
import { makeFlightCurve, orientAlongPath } from "./flightPath";

/**
 * Freeze the fold at a fraction of its sequence, for inspecting geometry.
 * null = run normally. Checkpoints:
 *   0.00  flat card, floating clear of the deck
 *   0.18  centre crease scored
 *   0.42  triangular nose formed
 *   0.66  nose narrowed
 *   0.84  body folded down the centre
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
const POSE_FOLD: [number, number, number] = [-0.52, 0.34, -0.08];
/** Turned to show the finished plane off before it leaves. */
const POSE_HERO: [number, number, number] = [-0.3, 0.86, 0.12];

/** Clear airspace beside the deck, where the folding is actually visible. */
const FOLD_POS = new THREE.Vector3(-2.35, 0.55, 2.6);

interface PieceProps {
  points: [number, number][];
  lift: number;
  face: THREE.Texture;
  back: THREE.Texture;
}

/** One flat region, rendered front and back so the card reads as printed paper. */
function Piece({ points, lift, face, back }: PieceProps) {
  const geo = useMemo(() => polygonGeometry(points, lift), [points, lift]);
  const geoBack = useMemo(() => polygonGeometry(points, lift - 0.004), [points, lift]);
  return (
    <>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial map={face} roughness={0.92} metalness={0} side={THREE.FrontSide} />
      </mesh>
      <mesh geometry={geoBack} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={back} roughness={0.95} metalness={0} side={THREE.FrontSide} />
      </mesh>
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
  nose2: React.RefObject<THREE.Group | null>;
}

function Half({
  sign,
  refs,
  face,
  back,
}: {
  sign: number;
  refs: HalfRefs;
  face: THREE.Texture;
  back: THREE.Texture;
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

      {/* The wing carries the nose folds when it swings out, and nose1 nests
          inside nose2 because the paper demands it: c1 ends on the card's
          edge at (-n, H/2 - n), a fixed crease endpoint that the first fold
          cannot move. Only the second fold can draw it inboard. Folded as
          siblings the corner stays out at |x| = 1.25 and spikes past the
          wing's own leading edge; nested, it tucks to 0.87 and reads as the
          shoulder a real dart has where the nose layers end. */}
      <Pivot crease={cr.wing} refObj={refs.wing}>
        {piece("wing")}
        <Pivot crease={cr.nose2} refObj={refs.nose2}>
          {piece("nose2")}
          <Pivot crease={cr.nose1} refObj={refs.nose1}>
            {piece("nose1")}
          </Pivot>
        </Pivot>
      </Pivot>
    </Pivot>
  );
}

const mkRefs = (): HalfRefs => ({
  half: { current: null },
  wing: { current: null },
  nose1: { current: null },
  nose2: { current: null },
});

export default function FoldingCard({
  face,
  back,
  aspect,
  deckTop,
  startScale,
}: {
  face: THREE.Texture;
  back: THREE.Texture;
  aspect: number;
  deckTop: THREE.Vector3;
  /** Matches the deck, so at rest the card is indistinguishable from it. */
  startScale: number;
}) {
  const root = useRef<THREE.Group>(null);
  const L = useRef<HalfRefs>(mkRefs()).current;
  const R = useRef<HalfRefs>(mkRefs()).current;

  const curve = useMemo(() => makeFlightCurve(aspect), [aspect]);
  const _pos = useMemo(() => new THREE.Vector3(), []);
  const _quat = useMemo(() => new THREE.Quaternion(), []);
  const _pose = useMemo(() => new THREE.Quaternion(), []);
  const _euler = useMemo(() => new THREE.Euler(), []);
  /** Where the card clears to before drifting into shot. */
  const _lifted = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const g = root.current;
    if (!g) return;

    // Debug freeze maps [0,1] onto the folding window, so a checkpoint shows
    // the card parked in its folding pose at that stage.
    const t =
      DEBUG_FOLD_PROGRESS == null
        ? clock.elapsedTime % LOOP_SECONDS
        : CUE.crease[0] + (CUE.wings[1] - CUE.crease[0]) * DEBUG_FOLD_PROGRESS;

    // ── folds ──────────────────────────────────────────────────────────────
    // Every one of these is 0 until its window opens, and the earliest window
    // opens at FOLD_START — after the card has left the deck and settled.
    // A shallow centre crease is scored first and then relaxed: the paper
    // remembers the line before anything folds along it.
    // Scoring only: 0.3 rad lifted the halves 0.37 above the plane, which
    // reads as a fold rather than a crease being marked. 0.12 peaks at 0.15.
    const scored = seg(t, CUE.crease[0], CUE.crease[1], 0, 0.12, sineInOut);
    const relax = 1 - seg(t, CUE.crease[1], CUE.nose2[0], 0, 0.6, sineInOut);
    const nose1 = seg(t, CUE.nose1[0], CUE.nose1[1], 0, FLAT, power2InOut);
    const nose2 = seg(t, CUE.nose2[0], CUE.nose2[1], 0, FLAT, power2InOut);
    const half = seg(t, CUE.half[0], CUE.half[1], 0, HALF_CLOSE, power2InOut);
    const wing = seg(t, CUE.wings[0], CUE.wings[1], 0, WING_BACK, power2InOut);

    for (const [sign, refs] of [
      [-1, L],
      [1, R],
    ] as const) {
      // Both halves must fold to the SAME side of the sheet. Rotating about
      // +Y sends +x toward -z and -x toward +z, so the mirrored halves need
      // opposite senses to end up together: hence -sign throughout.
      const d = -sign;
      if (refs.half.current) refs.half.current.rotation.x = d * (scored * relax + half);
      if (refs.wing.current) refs.wing.current.rotation.x = d * wing;
      if (refs.nose1.current) refs.nose1.current.rotation.x = d * nose1;
      if (refs.nose2.current) refs.nose2.current.rotation.x = d * nose2;
    }

    // ── extraction: deck -> clear air -> folding position ──────────────────
    const lift = span(t, CUE.lift[0], CUE.lift[1]);
    const drift = span(t, CUE.drift[0], CUE.drift[1]);
    const eLift = power2InOut(lift);
    const eDrift = sineInOut(drift);
    // 0 at both ends of the lift, 1 in the middle: the peel that makes it read
    // as a card being pulled off a stack rather than rising on a lift.
    const peel = Math.sin(lift * Math.PI);

    // Clear of the stack by well over a card width, and forward toward camera.
    _lifted.set(deckTop.x + 0.45, deckTop.y + 1.75, deckTop.z + 1.35);
    _pos.copy(deckTop).lerp(_lifted, eLift);
    _pos.x -= peel * 0.3;
    _pos.z += peel * 0.55;
    _pos.lerp(FOLD_POS, eDrift);

    // Orientation: flat on the deck, still flat while lifting, turning into
    // the three-quarter folding pose only during the drift.
    _euler.set(
      THREE.MathUtils.lerp(POSE_DECK[0], POSE_FOLD[0], eDrift) + peel * 0.2,
      THREE.MathUtils.lerp(POSE_DECK[1], POSE_FOLD[1], eDrift) + peel * 0.28,
      THREE.MathUtils.lerp(POSE_DECK[2], POSE_FOLD[2], eDrift) - peel * 0.3
    );

    // ── hero pose: hold, and turn to show the finished plane ───────────────
    const hero = sineInOut(span(t, CUE.hero[0], CUE.hero[1]));
    if (hero > 0) {
      _euler.set(
        THREE.MathUtils.lerp(POSE_FOLD[0], POSE_HERO[0], hero),
        THREE.MathUtils.lerp(POSE_FOLD[1], POSE_HERO[1], hero),
        THREE.MathUtils.lerp(POSE_FOLD[2], POSE_HERO[2], hero)
      );
      // Barely moving — enough to feel alive, not enough to distract.
      _pos.y += hero * 0.12;
    }
    _pose.setFromEuler(_euler);
    _quat.copy(_pose);

    // ── launch and flight ──────────────────────────────────────────────────
    const launch = span(t, CUE.launch[0], CUE.launch[1]);
    const flight = span(t, CUE.flight[0], CUE.flight[1]);

    if (flight > 0) {
      // Ease in, cruise, ease out; a constant rate reads as a slide.
      const u = THREE.MathUtils.clamp(power3Out(flight) * 0.62 + flight * 0.38, 0, 1);
      curve.getPointAt(u, _pos);
      orientAlongPath(_quat, curve, u);
      // Blend out of the hero pose across the launch, so nothing snaps.
      if (launch < 1) _quat.slerp(_pose, 1 - power2InOut(launch)).normalize();
    } else if (launch > 0) {
      _pos.y += launch * 0.18;
      _pos.z += launch * 0.25;
    }

    g.position.copy(_pos);
    g.quaternion.copy(_quat);

    // Fade out and back in entirely off-camera. Everything above is a pure
    // function of t, so there is no state to restore at the loop point.
    const exit = span(t, CUE.flight[1] - 0.5, CUE.flight[1]);
    const enter = span(t, CUE.reset[1] - 0.4, CUE.reset[1]);
    const vis = DEBUG_FOLD_PROGRESS == null ? 1 - exit + enter : 1;

    // The card starts at the deck's scale and grows into the foreground as it
    // is drawn out, so the deck stays a small background source and this one
    // card becomes the subject. Combined with ~4 units of travel toward the
    // camera, the apparent size change is larger than the scale factor alone.
    const grow = THREE.MathUtils.lerp(
      startScale,
      1,
      sineInOut(span(t, CUE.lift[0], CUE.drift[1]))
    );

    g.visible = vis > 0.02;
    g.scale.setScalar(grow * THREE.MathUtils.clamp(vis, 0.001, 1));
  });

  return (
    <group ref={root}>
      {/* Shift so the nose, not the centre, is near the group origin: the
          flight path then orients about the point the eye tracks. */}
      <group position={[0, -H * 0.16, 0]}>
        <Half sign={-1} refs={L} face={face} back={back} />
        <Half sign={1} refs={R} face={face} back={back} />
      </group>
    </group>
  );
}
