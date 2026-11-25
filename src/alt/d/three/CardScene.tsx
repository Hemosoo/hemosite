import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Deck from "../../../three/Deck";
import { deckTopOffset } from "../../../three/deckMetrics";
import Lighting from "../../../three/Lighting";
import FoldingCard, { type Stage } from "./FoldingCard";
import { landing } from "./landing";
import { makeBackTexture, makeFaceTexture } from "./face";
import { PERSON } from "../../../content/profile";

/**
 * The hero scene: the deck, and the card that leaves it, folds into a paper
 * plane and lands on the page as the card in the About section.
 *
 * Nothing here is placed by hand-tuned world coordinates. The page has a
 * stage box beside the name, the card's size; every frame the deck, the fold
 * point and the card's size are taken from where that box is on screen, so
 * deck, plane and type stay one composition at any width.
 *
 * Rendering is on demand: frames are drawn while something is moving and
 * stop when the plane comes to rest.
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
    cam.lookAt(0, -0.2, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/** Depths: the deck sits back, the card comes forward to fold. */
const DECK_Z = -2.4;
const FOLD_Z = 1.8;
/** The card at its fold, as a share of the stage box's height. */
const CARD_FILL = 0.78;
/** The deck's cards relative to the card. */
const DECK_RATIO = 0.55;

const ORIGIN = new THREE.Vector3();
const _ray = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _fwd = new THREE.Vector3();

/** The world point under screen pixel (sx, sy) at world depth z. */
function screenToWorld(cam: THREE.PerspectiveCamera, sx: number, sy: number, z: number, out: THREE.Vector3) {
  _ray.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1, 0.5).unproject(cam);
  _dir.subVectors(_ray, cam.position);
  const k = (z - cam.position.z) / (_dir.z || 1e-5);
  return out.copy(cam.position).addScaledVector(_dir, k);
}

/** World units per screen pixel at a point. */
function worldPerPx(cam: THREE.PerspectiveCamera, at: THREE.Vector3) {
  _fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
  const d = _ray.copy(at).sub(cam.position).dot(_fwd);
  return (2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / window.innerHeight;
}

/** Keeps `stage` (and the deck) on the hero's stage box. */
function Anchor({ stage, deck }: { stage: Stage; deck: React.RefObject<THREE.Group | null> }) {
  const deckPos = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const el = landing.stage;
    if (!el) return;
    const cam = camera as THREE.PerspectiveCamera;
    const r = el.getBoundingClientRect();
    screenToWorld(cam, r.left + r.width / 2, r.top + r.height * 0.46, FOLD_Z, stage.fold);
    stage.cardScale = (CARD_FILL * r.height * worldPerPx(cam, stage.fold)) / 3.5;
    // The deck lies at the stage's foot, a little left, set back in depth.
    screenToWorld(cam, r.left + r.width * 0.3, r.top + r.height * 0.9, DECK_Z, deckPos);
    stage.deckScale = (stage.cardScale * DECK_RATIO * worldPerPx(cam, deckPos)) / worldPerPx(cam, stage.fold);
    deck.current?.position.copy(deckPos);
    deck.current?.scale.setScalar(stage.deckScale);
    stage.deckTop.copy(deckPos);
    stage.deckTop.y += deckTopOffset() * stage.deckScale;
  });
  return null;
}

/**
 * Once the card has landed the page owns it: stop rendering, hide the canvas,
 * and show the DOM card. Scrolling back up starts it again from where the
 * plane was.
 */
function Gate() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const stageEl = gl.domElement.closest<HTMLElement>("[data-stage]") ?? gl.domElement;
    let landed: boolean | null = null;
    const check = () => {
      const now = !!landing.slot && landing.progress() >= 1;
      if (now === landed) return;
      landed = now;
      stageEl.style.visibility = now ? "hidden" : "visible";
      if (now) landing.show(1);
      setFrameloop(now ? "never" : "demand");
      if (!now) invalidate();
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      stageEl.style.visibility = "";
      landing.release();
    };
  }, [gl, setFrameloop, invalidate]);
  return null;
}

function Scene({ shadows, quality }: { shadows: boolean; quality: number }) {
  // The card that leaves the deck is drawn from the page's own card, so the
  // one that lands is the one that left.
  const face = useMemo(() => makeFaceTexture(landing.slot, PERSON.portrait, quality), [quality]);
  const back = useMemo(() => makeBackTexture(quality), [quality]);
  useEffect(() => () => {
    face.dispose();
    back.dispose();
  }, [face, back]);

  const stage = useMemo<Stage>(
    () => ({ deckTop: new THREE.Vector3(), deckScale: 0.3, fold: new THREE.Vector3(), cardScale: 0.56 }),
    []
  );
  const deck = useRef<THREE.Group>(null);

  return (
    <>
      <Rig />
      <Gate />
      <Lighting shadows={shadows} />
      <Anchor stage={stage} deck={deck} />
      <group ref={deck}>
        <Deck position={ORIGIN} back={back} />
      </group>
      <FoldingCard face={face} back={back} stage={stage} />
    </>
  );
}

export default function CardScene() {
  // Shadow maps and high anisotropy are the first things to go on weak GPUs.
  const capable = useMemo(() => window.matchMedia("(min-width: 900px)").matches, []);
  return (
    <Canvas
      frameloop="demand"
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
