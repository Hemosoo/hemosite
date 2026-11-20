import { Suspense, lazy, useEffect, useState } from "react";

// three + fiber are a large dependency; keeping them out of the entry chunk
// means the wordmark paints before any of this is fetched.
const CardScene = lazy(() => import("./three/CardScene"));

/**
 * The WebGL hero backdrop (V1's copy of src/components/CardBackdrop.tsx):
 * mounts only when it can run and is worth running. Fixed to the window,
 * because the plane leaves the hero: scrolling down, it flies back down the
 * page and lands as the player card. The scene raises this layer above the
 * page while it lands (data-stage).
 */
export default function CardBackdrop() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(min-width: 640px)").matches) return;
    try {
      const probe = document.createElement("canvas");
      if (!(probe.getContext("webgl2") ?? probe.getContext("webgl"))) return;
    } catch {
      return;
    }
    const id = window.setTimeout(() => setReady(true), 360);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready) return null;
  return (
    <div aria-hidden data-stage className="pointer-events-none fixed inset-0" style={{ zIndex: 1 }}>
      <Suspense fallback={null}>
        <CardScene />
      </Suspense>
    </div>
  );
}
