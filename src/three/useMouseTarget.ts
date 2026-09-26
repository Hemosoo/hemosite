import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FLIGHT_CONFIG as F } from "./flightConfig";

/**
 * Turns the cursor into a world-space point the plane can aim at.
 *
 * Unprojects the pointer's NDC through the camera and walks the ray to a fixed
 * depth, rather than raycasting against an invisible plane — same result, no
 * extra object in the scene, and a fixed depth keeps the target stable when
 * the pointer crosses the middle of the frame.
 *
 * Nothing here touches React state: pointermove writes into refs and useFrame
 * reads them.
 */
export function useMouseTarget() {
  const ndc = useRef(new THREE.Vector2(0, 0));
  const seen = useRef(false);
  const lastMove = useRef(0);

  const tmpRay = useMemo(() => new THREE.Vector3(), []);
  const tmpDir = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!window.matchMedia?.("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      ndc.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      seen.current = true;
      lastMove.current = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  /** Writes the clamped world target into `out`. Returns false if no pointer. */
  const resolve = (camera: THREE.Camera, out: THREE.Vector3) => {
    if (!seen.current) return false;
    tmpRay.set(ndc.current.x, ndc.current.y, 0.5).unproject(camera);
    tmpDir.subVectors(tmpRay, camera.position);
    // Walk the ray to the chosen depth. Guard against a ray parallel to it.
    if (Math.abs(tmpDir.z) < 1e-5) return false;
    const k = (F.targetDepth - camera.position.z) / tmpDir.z;
    out.copy(camera.position).addScaledVector(tmpDir, k);
    const b = F.bounds;
    out.x = THREE.MathUtils.clamp(out.x, -b.x, b.x);
    out.y = THREE.MathUtils.clamp(out.y, -b.y, b.y);
    out.z = THREE.MathUtils.clamp(out.z, b.zMin, b.zMax);
    return true;
  };

  const idleFor = () => (seen.current ? (performance.now() - lastMove.current) / 1000 : Infinity);

  return { resolve, idleFor, hasPointer: () => seen.current };
}
