/**
 * Dark, high-contrast key/rim setup. White paper against near-black, with the
 * rim doing the work of separating folded edges from the background.
 */
export default function Lighting({ shadows }: { shadows: boolean }) {
  return (
    <>
      <ambientLight intensity={0.16} />
      <directionalLight
        position={[4.5, 8, 6]}
        intensity={2.4}
        color="#ffffff"
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0008}
      />
      {/* Rim from behind picks out the creases. */}
      <directionalLight position={[-6, 2.5, -7]} intensity={1.15} color="#9fc4ff" />
      {/* Travels with nothing — just warms the middle of the flight path. */}
      <pointLight position={[2, 2.4, 3]} intensity={9} distance={16} decay={2} color="#ffe6bd" />
    </>
  );
}
