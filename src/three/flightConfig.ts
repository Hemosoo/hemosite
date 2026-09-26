/**
 * Tuning for the physics-driven flight. Scene scale: the card is ~2 units
 * long, the visible frame ~8.5 x 5.3 at flight depth, so a speed of 3 crosses
 * the frame in under three seconds.
 */
export const FLIGHT_CONFIG = {
  /** Never stalls — the plane keeps gliding even when it reaches the cursor. */
  minSpeed: 1.6,
  maxSpeed: 4.2,
  /** How quickly speed closes on its target, per second. */
  acceleration: 2.2,

  /** Radians/second the heading may swing. This is the turning radius. */
  maxTurnRate: 2.1,
  /** How hard it commits to the desired heading, 0..1 per second. */
  steeringStrength: 3.4,

  /** Roll into turns, radians (~25 degrees). */
  maxBankAngle: 0.44,
  /** Turn rate to bank angle. */
  bankGain: 0.55,
  /** How fast roll follows the turn, and unwinds when flying straight. */
  bankResponse: 3.0,

  /** Nose lift/drop toward a target above or below, radians (~12 degrees). */
  maxPitch: 0.21,

  /** Radians/second the model's orientation chases its velocity. */
  orientRate: 7.0,

  /**
   * Inside this radius steering eases off, so the plane sails past the cursor
   * and curves back instead of jittering on top of it.
   */
  deadzone: 1.1,
  /** Circling radius once it is loitering near a stationary cursor. */
  orbitRadius: 1.3,
  orbitSpeed: 1.25,

  /** World-space Z the cursor is projected onto. */
  targetDepth: 1.5,
  /** The cursor target is clamped into this box so it can't fly off forever. */
  bounds: { x: 5.2, y: 3.0, zMin: -1.0, zMax: 3.4 },

  /** How long it chases the cursor before heading for the exit. */
  interactiveFlightSeconds: 7.0,
  /** Leaving the frame. */
  exitSeconds: 2.0,
  /** Speed multiplier once it commits to the exit. */
  exitSpeedBoost: 1.35,
  /** Fraction of the exit spent fading; it should be off-frame by then. */
  exitFadeFrom: 0.72,
} as const;

/** Takeoff ramps these in from ~0 so nothing switches on abruptly. */
export const TAKEOFF = {
  /** Speed the moment the plane starts moving, before acceleration builds. */
  startSpeed: 0.22,
  /** Orientation chases velocity slowly at first, so it can't snap. */
  startOrientRate: 1.4,
  /** Steering authority at the very start. */
  startSteering: 0.18,
} as const;
