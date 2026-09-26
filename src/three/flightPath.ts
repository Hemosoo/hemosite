import * as THREE from "three";

/** The nose. */
const FORWARD = new THREE.Vector3(0, 1, 0);
/**
 * The model's up is -Z, not +Z.
 *
 * Folding swings both halves the same way and the fuselage keel ends up
 * hanging toward +Z — so +Z is the plane's belly. Rolling +Z to meet world up
 * flies it inverted, showing the card backs and the unlit underside.
 */
const MODEL_UP = new THREE.Vector3(0, 0, -1);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const _heading = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _desiredUp = new THREE.Vector3();
const _base = new THREE.Quaternion();
const _roll = new THREE.Quaternion();

/**
 * Orientation from a heading plus a roll.
 *
 * `setFromUnitVectors` gives the shortest rotation taking the nose onto the
 * heading, which fixes heading and pitch but leaves roll undefined — a free
 * spin about the heading that would otherwise drift arbitrarily. So step two
 * measures the angle between the model's up and world up projected
 * perpendicular to the heading and cancels it, leaving `bank` as the only roll
 * in play. That is what lets banking be a deliberate, bounded quantity rather
 * than whatever the quaternion happened to produce.
 */
export function orientFromDirection(
  out: THREE.Quaternion,
  forward: THREE.Vector3,
  bank = 0
) {
  _heading.copy(forward).normalize();
  _base.setFromUnitVectors(FORWARD, _heading);

  _up.copy(MODEL_UP).applyQuaternion(_base);
  _desiredUp.copy(WORLD_UP).addScaledVector(_heading, -WORLD_UP.dot(_heading));
  if (_desiredUp.lengthSq() < 1e-6) _desiredUp.copy(MODEL_UP);
  _desiredUp.normalize();
  _right.crossVectors(_heading, _up).normalize();
  const twist = Math.atan2(_desiredUp.dot(_right), _desiredUp.dot(_up));

  _roll.setFromAxisAngle(_heading, -twist + bank);
  return out.copy(_roll).multiply(_base);
}
