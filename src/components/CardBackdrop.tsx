import { Suspense, lazy, useEffect, useState } from "react";

// three + fiber are a large dependency; keeping them out of the entry chunk
// means the wordmark paints before any of this is fetched.
const CardScene = lazy(() => import("../three/CardScene"));

/** WebGL hero backdrop: mounts only when it can run and is worth running. */
export default function CardBackdrop() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // A phone with no pointer gets the static page; the scene is not worth the
    // battery or the download there.
    if (!window.matchMedia("(min-width: 640px)").matches) return;
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
      if (!gl) return;
    } catch {
      return;
    }
    // Wait for first paint so the scene never competes with the hero's own
    // entrance animation.
    const id = window.setTimeout(() => setReady(true), 360);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <Suspense fallback={null}>
        <CardScene />
      </Suspense>
    </div>
  );
}
