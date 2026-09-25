import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { W, H } from "./cardModel";
import { DECK_COUNT as COUNT, CARD_THICKNESS as THICK } from "./deckMetrics";

/**
 * The deck as real layered cards, not one block.
 *
 * One InstancedMesh: 46 separate card bodies but a single draw call, and the
 * per-card jitter lives in the instance matrices rather than in 46 objects the
 * renderer has to walk every frame.
 */
export default function Deck({
  position,
  back,
}: {
  position: THREE.Vector3;
  back: THREE.Texture;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(W, THICK, H), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    // Deterministic jitter: a stack that is perfectly square reads as a solid.
    const rnd = (i: number, k: number) => Math.sin(i * 12.9898 + k * 78.233) * 0.5;

    for (let i = 0; i < COUNT; i++) {
      const slouch = i / COUNT;
      p.set(rnd(i, 1) * 0.055, i * THICK, rnd(i, 2) * 0.055);
      e.set(rnd(i, 3) * 0.012, rnd(i, 4) * 0.05 + slouch * 0.015, rnd(i, 5) * 0.012);
      q.setFromEuler(e);
      m.compose(p, q, one);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  return (
    <instancedMesh
      ref={ref}
      args={[geo, undefined, COUNT]}
      position={position}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial map={back} roughness={0.88} metalness={0} color="#cfd6e2" />
    </instancedMesh>
  );
}

