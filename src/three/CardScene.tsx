import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import Deck from "./Deck";
import { deckTopOffset } from "./deckMetrics";
import Lighting from "./Lighting";
import FoldingCard from "./FoldingCard";
import { makeFaceTexture, makeBackTexture } from "./textures";

/**
 * Camera framing is derived from aspect rather than scaled from a desktop
 * layout: a narrow viewport pulls back and raises the camera so the deck stays
 * in frame and the flight still crosses interesting space.
 */
function Rig({ onAspect }: { onAspect: (a: number) => void }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    onAspect(aspect);
    const cam = camera as THREE.PerspectiveCamera;
    const narrow = THREE.MathUtils.clamp((1.1 - aspect) / 0.7, 0, 1);
    cam.position.set(
      THREE.MathUtils.lerp(1.6, 0.4, narrow),
      THREE.MathUtils.lerp(2.4, 3.4, narrow),
      THREE.MathUtils.lerp(9.5, 13.5, narrow)
    );
    cam.fov = THREE.MathUtils.lerp(38, 52, narrow);
    cam.lookAt(0, -0.2, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, onAspect]);
  return null;
}

/** Resting size of the deck. The extracted card starts here and grows to 1. */
const DECK_SCALE = 0.3;
const ORIGIN = new THREE.Vector3(0, 0, 0);

function Scene({ shadows, quality }: { shadows: boolean; quality: number }) {
  const [aspect, setAspect] = useState(1.6);
  const face = useMemo(() => makeFaceTexture(quality), [quality]);
  const back = useMemo(() => makeBackTexture(quality), [quality]);

  // Textures are canvas-backed and owned here; release the GPU copies on unmount.
  useEffect(() => () => {
    face.dispose();
    back.dispose();
  }, [face, back]);

  /**
   * The deck is a background source, not the subject: smaller and set back in
   * depth, so the card that leaves it can become the thing you look at.
   */
  const deckPos = useMemo(() => new THREE.Vector3(-3.5, -1.85, -2.4), []);
  // Top of the stack, in world units, accounting for the deck's own scale.
  const deckTop = useMemo(
    () =>
      new THREE.Vector3(
        deckPos.x,
        deckPos.y + deckTopOffset() * DECK_SCALE,
        deckPos.z
      ),
    [deckPos]
  );

  return (
    <>
      <Rig onAspect={setAspect} />
      <Lighting shadows={shadows} />
      <group position={deckPos} scale={DECK_SCALE}>
        <Deck position={ORIGIN} back={back} />
      </group>
      <FoldingCard
        face={face}
        back={back}
        aspect={aspect}
        deckTop={deckTop}
        startScale={DECK_SCALE}
      />
      {/* Catches the deck's shadow; invisible against the black otherwise. */}
      {shadows && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.95, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <shadowMaterial opacity={0.5} />
        </mesh>
      )}
    </>
  );
}

export default function CardScene() {
  // Shadow maps and high anisotropy are the first things to go on weak GPUs.
  const capable = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches,
    []
  );

  return (
    <Canvas
      dpr={[1, capable ? 2 : 1.5]}
      shadows={capable}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 38, near: 0.5, far: 60 }}
      style={{ pointerEvents: "none" }}
    >
      <Scene shadows={capable} quality={capable ? 8 : 2} />
    </Canvas>
  );
}
