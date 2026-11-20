import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Deck from "../../../three/Deck";
import { deckTopOffset } from "../../../three/deckMetrics";
import Lighting from "../../../three/Lighting";
import FoldingCard from "../../../three/FoldingCard";
import { makeBackTexture } from "../../../three/textures";
import { landing } from "../../../three/landing";
import { makeV1FaceTexture } from "./textures";
import { PERSON } from "../../../content/profile";

/**
 * V1's copy of src/three/CardScene.tsx: the same scene, with V1's card face
 * (so the card that lands is V1's card) and the deck raised to sit level with
 * the name rather than in the bottom corner.
 *
 * Camera framing is derived from aspect rather than scaled from a desktop
 * layout: a narrow viewport pulls back and raises the camera so the deck stays
 * in frame and the flight still crosses interesting space.
 */
function Rig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const cam = camera as THREE.PerspectiveCamera;
    const narrow = THREE.MathUtils.clamp((1.1 - aspect) / 0.7, 0, 1);
    cam.position.set(
      THREE.MathUtils.lerp(1.6, 0.4, narrow),
      THREE.MathUtils.lerp(2.4, 3.4, narrow),
      THREE.MathUtils.lerp(9.5, 13.5, narrow)
    );
    cam.fov = THREE.MathUtils.lerp(38, 52, narrow);
    // On a squarer screen (a small laptop, a tablet held sideways) the fold
    // pose falls off the left edge: slide the view left so the whole scene
    // moves right, toward the name it sits beside.
    // Portrait screens keep the original framing.
    const shift =
      THREE.MathUtils.clamp((1.6 - aspect) / 0.35, 0, 1) * THREE.MathUtils.clamp((aspect - 0.95) / 0.2, 0, 1) * 1.1;
    cam.position.x -= shift;
    cam.lookAt(-shift, -0.2, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/** Resting size of the deck. The extracted card starts here and grows to 1. */
const DECK_SCALE = 0.3;
const ORIGIN = new THREE.Vector3(0, 0, 0);
// Just under the raised deck, so its shadow still lands on something.
const GROUND_POS = new THREE.Vector3(0, -1.3, 0);

/**
 * The deck belongs to the hero, and the canvas is fixed to the window so the
 * plane can fly down the page to land: the deck (and the floor that catches
 * its shadow) scroll away with the hero, at their own depth, as if they were
 * printed on it. `deckTop` is moved with them, so a card drawn mid-scroll
 * still leaves the top of the stack.
 */
function ScrollWithPage({
  deck,
  ground,
  deckPos,
  deckTop,
}: {
  deck: React.RefObject<THREE.Group | null>;
  ground: React.RefObject<THREE.Mesh | null>;
  deckPos: THREE.Vector3;
  deckTop: THREE.Vector3;
}) {
  const topOffset = useMemo(() => deckTopOffset() * DECK_SCALE, []);
  const up = useMemo(() => new THREE.Vector3(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const cam = camera as THREE.PerspectiveCamera;
    up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const d = tmp.copy(deckPos).sub(cam.position).dot(fwd);
    const perPx = (2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / Math.max(1, size.height);
    const lift = window.scrollY * perPx;
    deck.current?.position.copy(deckPos).addScaledVector(up, lift);
    ground.current?.position.copy(GROUND_POS).addScaledVector(up, lift);
    deckTop.copy(deckPos).addScaledVector(up, lift);
    deckTop.y += topOffset;
  });
  return null;
}

/**
 * Once the card has landed the page owns it: stop rendering, hide the canvas,
 * and show the DOM card. Scrolling back up starts it all again from where the
 * plane left off.
 */
function Gate() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const stage = gl.domElement.parentElement?.parentElement ?? gl.domElement;
    let landed: boolean | null = null;
    const check = () => {
      const now = !!landing.slot && landing.progress() >= 1;
      if (now === landed) return;
      landed = now;
      stage.style.visibility = now ? "hidden" : "visible";
      if (now) landing.show(1);
      setFrameloop(now ? "never" : "always");
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      stage.style.visibility = "";
      landing.release();
    };
  }, [gl, setFrameloop]);
  return null;
}

function Scene({ shadows, quality }: { shadows: boolean; quality: number }) {
  // The card that leaves the deck is the player card, so the one that lands
  // on the page is the one that left.
  const face = useMemo(() => makeV1FaceTexture(PERSON.portrait, quality), [quality]);
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
  // Raised from the original's bottom corner: level with the lower half of
  // the name, so deck, card and type read as one composition.
  const deckPos = useMemo(() => new THREE.Vector3(-3.6, -1.2, -2.4), []);
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

  const deckGroup = useRef<THREE.Group>(null);
  const ground = useRef<THREE.Mesh>(null);

  return (
    <>
      <Rig />
      <Gate />
      <Lighting shadows={shadows} />
      <ScrollWithPage
        deck={deckGroup}
        ground={ground}
        deckPos={deckPos}
        deckTop={deckTop}
      />
      <group ref={deckGroup} position={deckPos} scale={DECK_SCALE}>
        <Deck position={ORIGIN} back={back} />
      </group>
      <FoldingCard face={face} back={back} deckTop={deckTop} startScale={DECK_SCALE} />
      {/* Catches the deck's shadow; invisible against the black otherwise. */}
      {shadows && (
        <mesh ref={ground} rotation={[-Math.PI / 2, 0, 0]} position={GROUND_POS} receiveShadow>
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
