import * as THREE from 'three';

export interface FABRIKChain {
  bones: THREE.Bone[];           // Chain from root to tip (e.g. metacarpal \u2192 proximal \u2192 distal \u2192 tip)
  target: THREE.Vector3;         // Desired position of the tip
  maxIterations?: number;
  tolerance?: number;
  maxReach?: number;             // Optional: limit how far the chain can stretch
}

/**
 * FABRIK Inverse Kinematics Solver
 * - Very natural results for finger and hand chains
 * - Fast and stable
 */
export function solveFABRIK(chain: FABRIKChain): boolean {
  const {
    bones,
    target,
    maxIterations = 12,
    tolerance = 0.005,
    maxReach = Infinity,
  } = chain;

  if (bones.length < 2) return false;

  const positions: THREE.Vector3[] = bones.map(bone => 
    new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld)
  );

  const originalPositions = positions.map(p => p.clone());

  const tipIndex = bones.length - 1;
  let distanceToTarget = positions[tipIndex].distanceTo(target);

  // Early exit if already close enough
  if (distanceToTarget < tolerance) return true;

  // Forward Reaching Phase
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Backward pass: move from tip to root
    positions[tipIndex].copy(target);

    for (let i = tipIndex - 1; i >= 0; i--) {
      const current = positions[i];
      const next = positions[i + 1];
      const dir = next.clone().sub(current).normalize();

      const boneLength = originalPositions[i + 1].distanceTo(originalPositions[i]);

      // Move current bone toward next while preserving length
      current.copy(next).sub(dir.multiplyScalar(boneLength));
    }

    // Forward pass: move from root to tip
    positions[0].copy(originalPositions[0]); // Root is fixed (wrist usually stays anchored)

    for (let i = 0; i < tipIndex; i++) {
      const current = positions[i];
      const next = positions[i + 1];
      const dir = next.clone().sub(current).normalize();

      const boneLength = originalPositions[i + 1].distanceTo(originalPositions[i]);

      next.copy(current).add(dir.multiplyScalar(boneLength));
    }

    // Check convergence
    distanceToTarget = positions[tipIndex].distanceTo(target);
    if (distanceToTarget < tolerance) break;
  }

  // Apply solved positions back to bones with smooth rotation
  for (let i = 0; i < bones.length - 1; i++) {
    const bone = bones[i];
    const currentPos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
    const targetPos = positions[i + 1];

    const toCurrent = currentPos.clone().sub(positions[i]).normalize();
    const toTarget = targetPos.clone().sub(positions[i]).normalize();

    const rotation = new THREE.Quaternion().setFromUnitVectors(toCurrent, toTarget);

    bone.quaternion.premultiply(rotation);
    bone.updateMatrixWorld(true);
  }

  return distanceToTarget < tolerance;
}
