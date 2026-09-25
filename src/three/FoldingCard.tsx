import { useMemo, useRef } from "react";
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
 * Folds stop a little short of a straight 180 so coincident layers keep a
 * sliver of separation; combined with the per-layer z lift this is what avoids
 * z-fighting where the paper doubles back on itself.
 */
const FLAT = Math.PI * 0.965;
/** Halves close most of the way, leaving the fuselage a shallow V. */
const HALF_CLOSE = 2.62;
/** Wings swing back past the fold to sit just above level: dihedral. */
const WING_BACK = -2.36;

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

/** A group whose origin sits on a crease, with its child cancelled back into card space. */
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
  return (
    <group ref={refObj} position={[crease.point[0], crease.point[1], 0]} rotation={[0, 0, crease.angle]}>
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

  return (
    <Pivot crease={cr.centre} refObj={refs.half}>
      {/* Body inboard of the wing crease stays with the half. */}
      <Piece points={byId("inner").points} lift={0} face={face} back={back} />

      <Pivot crease={cr.wing} refObj={refs.wing}>
        <Piece points={byId("wing").points} lift={0} face={face} back={back} />
      </Pivot>

      {/* nose1 is nested inside nose2, so the corner fold travels with the
          second fold exactly as the paper layer would. */}
      <Pivot crease={cr.nose2} refObj={refs.nose2}>
        <Piece points={byId("nose2").points} lift={0.006} face={face} back={back} />
        <Pivot crease={cr.nose1} refObj={refs.nose1}>
          <Piece points={byId("nose1").points} lift={0.012} face={face} back={back} />
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
}: {
  face: THREE.Texture;
  back: THREE.Texture;
  aspect: number;
  deckTop: THREE.Vector3;
}) {
  const root = useRef<THREE.Group>(null);
  const L = useRef<HalfRefs>(mkRefs()).current;
  const R = useRef<HalfRefs>(mkRefs()).current;

  const curve = useMemo(() => makeFlightCurve(aspect), [aspect]);
  const _pos = useMemo(() => new THREE.Vector3(), []);
  const _quat = useMemo(() => new THREE.Quaternion(), []);
  const _rest = useMemo(() => new THREE.Quaternion(), []);
  const _tmp = useMemo(() => new THREE.Quaternion(), []);

  useFrame(({ clock }) => {
    const g = root.current;
    if (!g) return;
    const t = clock.elapsedTime % LOOP_SECONDS;

    // ── folds ──────────────────────────────────────────────────────────────
    // A shallow centre crease is scored first, then relaxed: the paper
    // remembers the line before anything is folded along it.
    const scored = seg(t, CUE.crease[0], CUE.crease[1], 0, 0.22, sineInOut);
    const relax = 1 - seg(t, CUE.crease[1], CUE.nose1[1], 0, 0.55, sineInOut);
    const nose1 = seg(t, CUE.nose1[0], CUE.nose1[1], 0, FLAT, power2InOut);
    const nose2 = seg(t, CUE.nose2[0], CUE.nose2[1], 0, FLAT * 0.92, power2InOut);
    const half = seg(t, CUE.half[0], CUE.half[1], 0, HALF_CLOSE, power2InOut);
    const wing = seg(t, CUE.wings[0], CUE.wings[1], 0, WING_BACK, power2InOut);
    const trim = seg(t, CUE.trim[0], CUE.trim[1], 0, 0.14, sineInOut);

    for (const [s, refs] of [
      [-1, L],
      [1, R],
    ] as const) {
      // Mirrored halves fold in opposite senses about their shared creases.
      if (refs.half.current) refs.half.current.rotation.x = s * (scored * relax + half);
      if (refs.wing.current) refs.wing.current.rotation.x = s * (wing - trim);
      if (refs.nose1.current) refs.nose1.current.rotation.x = s * nose1;
      if (refs.nose2.current) refs.nose2.current.rotation.x = s * nose2;
    }

    // ── extraction ─────────────────────────────────────────────────────────
    // Not a straight rise: the card is peeled off the stack, so it tips on two
    // axes and drifts before it settles into the folding pose.
    const lift = span(t, CUE.lift[0], CUE.lift[1]);
    const e = power2InOut(lift);
    const peel = Math.sin(lift * Math.PI); // 0 at both ends, 1 mid-extraction

    _pos.set(
      THREE.MathUtils.lerp(deckTop.x, -3.2, e) - peel * 0.35,
      THREE.MathUtils.lerp(deckTop.y, -1.4, e) + peel * 0.5,
      THREE.MathUtils.lerp(deckTop.z, 0.4, e) + peel * 0.9
    );

    // Flat on the deck (face up, lying down) to upright in the fold plane.
    _rest.setFromEuler(
      new THREE.Euler(
        THREE.MathUtils.lerp(-Math.PI / 2, -0.32, e) + peel * 0.34,
        peel * 0.55,
        THREE.MathUtils.lerp(0.06, -0.12, e) - peel * 0.42
      )
    );
    _quat.copy(_rest);

    // ── launch and flight ──────────────────────────────────────────────────
    const launch = span(t, CUE.launch[0], CUE.launch[1]);
    const flight = span(t, CUE.flight[0], CUE.flight[1]);

    if (flight > 0) {
      // Ease in, cruise, ease out — a constant-rate traverse reads as a slide.
      const u = power3Out(flight) * 0.62 + flight * 0.38;
      curve.getPointAt(THREE.MathUtils.clamp(u, 0, 1), _pos);
      orientAlongPath(_quat, curve, u);
      // Blend out of the fold pose over the launch window so there is no snap.
      if (launch < 1) _quat.slerp(_rest, 1 - power2InOut(launch)).normalize();
    } else if (launch > 0) {
      // Nose drops and the plane squares up before it is released.
      _tmp.setFromEuler(new THREE.Euler(-0.28, 0, 0));
      _quat.multiply(_tmp);
      _pos.y += launch * 0.22;
      _pos.z += launch * 0.3;
    }

    g.position.copy(_pos);
    g.quaternion.copy(_quat);

    // Fade in on the way out and back in, entirely off-camera, so the reset
    // never shows. Everything above is a pure function of t, so there is no
    // state to restore.
    const exit = span(t, CUE.flight[1] - 0.5, CUE.flight[1]);
    const enter = span(t, CUE.reset[1] - 0.35, CUE.reset[1]);
    const vis = 1 - exit + enter;
    g.visible = t < CUE.reset[0] || vis > 0.02;
    g.scale.setScalar(THREE.MathUtils.clamp(vis, 0.001, 1));
  });

  return (
    <group ref={root}>
      {/* The two halves share the centre crease; together they are the card. */}
      <group position={[0, -H * 0.12, 0]}>
        <Half sign={-1} refs={L} face={face} back={back} />
        <Half sign={1} refs={R} face={face} back={back} />
      </group>
    </group>
  );
}
