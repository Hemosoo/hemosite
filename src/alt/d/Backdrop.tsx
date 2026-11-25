import { Suspense, lazy, useEffect, useState } from "react";

// three.js and fiber are large: kept out of the entry chunk and fetched only
// once the page has painted, so the type never waits on them.
const CardScene = lazy(() => import("./three/CardScene"));

/**
 * The WebGL layer, fixed to the window because the plane leaves the hero: it
 * flies down the page and lands as the card in the About section. Mounted
 * only where the page has chosen the scene (see sceneCanRun).
 */
export default function Backdrop() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(id);
  }, []);
  if (!ready) return null;
  return (
    <div aria-hidden data-stage className="d-stage-layer">
      <Suspense fallback={null}>
        <CardScene />
      </Suspense>
    </div>
  );
}
