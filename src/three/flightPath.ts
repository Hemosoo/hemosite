import * as THREE from "three";

/**
 * A curved route through depth, not a sideways slide.
 *
 * Control points climb away from the deck, swing toward the camera, cross the
 * frame and then recede — so the plane changes scale as well as position,
 * which is what sells the space as 3D.
 */
export function makeFlightCurve(aspect: number): THREE.CatmullRomCurve3 {
  // Wider viewports get a longer lateral sweep; taller ones lean on depth.
  const x = THREE.MathUtils.clamp(9 * aspect, 7, 16);
  return new THREE.CatmullRomCurve3(
    [
      // Starts where the fold finished, so the launch is continuous.
      new THREE.Vector3(-2.35, 0.55, 2.6),
      new THREE.Vector3(-1.7, 1.15, 3.4),
      new THREE.Vector3(-0.2, 1.85, 4.2),
      new THREE.Vector3(x * 0.34, 1.4, 1.2),
      new THREE.Vector3(x * 0.62, 0.2, -3.2),
      new THREE.Vector3(x * 0.95, -0.6, -9.5),
    ],
    false,
    "catmullrom",
    0.5
  );
}

const FORWARD = new THREE.Vector3(0, 1, 0);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const _tangent = new THREE.Vector3();
const _ahead = new THREE.Vector3();
const _turn = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _desiredUp = new THREE.Vector3();
const _base = new THREE.Quaternion();
const _roll = new THREE.Quaternion();

/**
 * Point the plane along the curve and bank it into its turns.
 *
 * Three steps:
 *  1. The shortest rotation taking the model's nose (+Y) onto the tangent.
 *     That fixes heading and pitch but leaves roll undefined — a free spin
 *     about the tangent that would otherwise drift arbitrarily.
 *  2. Pin roll by measuring the angle between the plane's current up and world
 *     up projected perpendicular to the tangent, then undoing it.
 *  3. Bank into the turn. The turn vector is the change in tangent over a
 *     small step ahead; its component along the plane's right axis is the
 *     lateral acceleration, and banking is proportional to it, as it is for a
 *     real aircraft where lift tilts to supply centripetal force.
 */
export function orientAlongPath(
  out: THREE.Quaternion,
  curve: THREE.CatmullRomCurve3,
  t: number,
  bankStrength = 2.6,
  maxBank = 0.72
) {
  curve.getTangentAt(THREE.MathUtils.clamp(t, 0, 1), _tangent).normalize();
  curve.getTangentAt(THREE.MathUtils.clamp(t + 0.02, 0, 1), _ahead).normalize();

  _base.setFromUnitVectors(FORWARD, _tangent);

  // Roll correction: where "up" currently points vs where it should.
  _up.set(0, 0, 1).applyQuaternion(_base);
  _desiredUp.copy(WORLD_UP).addScaledVector(_tangent, -WORLD_UP.dot(_tangent));
  if (_desiredUp.lengthSq() < 1e-6) _desiredUp.set(0, 0, 1);
  _desiredUp.normalize();
  _right.crossVectors(_tangent, _up).normalize();
  const twist = Math.atan2(_desiredUp.dot(_right), _desiredUp.dot(_up));

  _turn.subVectors(_ahead, _tangent);
  const lateral = _turn.dot(_right);
  const bank = THREE.MathUtils.clamp(lateral * bankStrength, -maxBank, maxBank);

  _roll.setFromAxisAngle(_tangent, -twist + bank);
  out.copy(_roll).multiply(_base);
  return out;
}
