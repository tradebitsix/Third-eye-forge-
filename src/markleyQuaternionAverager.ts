import * as THREE from 'three';

/**
 * Markley Quaternion Averaging (High-Accuracy Method)
 * Best for multi-source blending in hand animation (WebXR + IK + gestures)
 * Reference: F. Landis Markley, "Attitude Determination using Vector Observations and the Singular Value Decomposition"
 */
export class MarkleyQuaternionAverager {
  private sources: Array<{ quat: THREE.Quaternion; weight: number }> = [];

  addSource(quat: THREE.Quaternion, weight: number = 1.0) {
    // Ensure shortest path (antipodal handling)
    if (this.sources.length > 0) {
      const first = this.sources[0].quat;
      if (quat.dot(first) < 0) {
        quat.x *= -1;
        quat.y *= -1;
        quat.z *= -1;
        quat.w *= -1;
      }
    }
    this.sources.push({ quat: quat.clone(), weight });
  }

  clear() {
    this.sources.length = 0;
  }

  /**
   * Compute the most accurate average quaternion using Markley's method
   */
  computeAverage(): THREE.Quaternion {
    if (this.sources.length === 0) {
      return new THREE.Quaternion();
    }
    if (this.sources.length === 1) {
      return this.sources[0].quat.clone();
    }

    // Build the 4x4 symmetric matrix M = sum(w_i * q_i * q_i^T)
    const M = new THREE.Matrix4().set(
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0
    );

    let totalWeight = 0;

    this.sources.forEach(({ quat, weight }) => {
      const q = quat; // [x, y, z, w]
      const w = weight;
      totalWeight += w;

      // Diagonal elements
      M.elements[0] += w * (q.x * q.x);  // xx
      M.elements[5] += w * (q.y * q.y);  // yy
      M.elements[10] += w * (q.z * q.z); // zz
      M.elements[15] += w * (q.w * q.w); // ww

      // Off-diagonal
      M.elements[1] += w * (q.x * q.y);  // xy
      M.elements[2] += w * (q.x * q.z);  // xz
      M.elements[3] += w * (q.x * q.w);  // xw
      M.elements[6] += w * (q.y * q.z);  // yz
      M.elements[7] += w * (q.y * q.w);  // yw
      M.elements[11] += w * (q.z * q.w); // zw
    });

    // Make symmetric (copy upper to lower)
    M.elements[4] = M.elements[1];
    M.elements[8] = M.elements[2];
    M.elements[12] = M.elements[3];
    M.elements[9] = M.elements[6];
    M.elements[13] = M.elements[7];
    M.elements[14] = M.elements[11];

    if (totalWeight > 0) {
      M.multiplyScalar(1 / totalWeight);
    }

    // Compute eigenvalues and eigenvectors
    const eigenvector = this.powerIteration(M, 12); 

    // Return the eigenvector as quaternion and normalize
    const avgQuat = new THREE.Quaternion(eigenvector.x, eigenvector.y, eigenvector.z, eigenvector.w);
    avgQuat.normalize();

    return avgQuat;
  }

  // Simple power iteration to find dominant eigenvector
  private powerIteration(matrix: THREE.Matrix4, iterations: number): THREE.Vector4 {
    let v = new THREE.Vector4(0, 0, 0, 1); 

    for (let i = 0; i < iterations; i++) {
      v.applyMatrix4(matrix);
      v.normalize();
    }

    return v;
  }
}
