import * as THREE from 'three';

export class SkeletalBlender {
  private boneMaps = new Map<'left' | 'right', Map<string, THREE.Bone>>();
  
  // Current blend weights per bone (0 = fully WebXR tracked, 1 = fully IK)
  private currentWeights = new Map<string, number>();
  
  // Target weights (set by gestures/IK triggers)
  private targetWeights = new Map<string, number>();
  
  // Damping factor (0.05 = very smooth/slow, 0.25 = responsive)
  private dampingFactor: number = 0.18;

  constructor(dampingFactor: number = 0.18) {
    this.dampingFactor = dampingFactor;
  }

  addHandModel(handSide: 'left' | 'right', model: THREE.Group) {
    const map = new Map<string, THREE.Bone>();
    model.traverse((child) => {
      if (child instanceof THREE.Bone) {
        const name = child.name.toLowerCase().replace(/[_ ]/g, '-');
        // Match WebXR generic-hand joint names
        if (this.isWebXRJointName(name)) {
          map.set(name, child);
        }
      }
    });
    this.boneMaps.set(handSide, map);
  }

  private isWebXRJointName(name: string): boolean {
    const jointNames = [
      'wrist', 'thumb-', 'index-finger-', 'middle-finger-', 
      'ring-finger-', 'pinky-finger-'
    ];
    return jointNames.some(j => name.includes(j));
  }

  // Set target blend weight for a specific bone or group (e.g., fingers)
  setTargetWeight(boneNamePattern: string, weight: number) {
    this.targetWeights.set(boneNamePattern, Math.max(0, Math.min(1, weight)));
  }

  // Smoothly damp current weights toward target weights
  private updateDampedWeights() {
    this.targetWeights.forEach((targetWeight, pattern) => {
      this.boneMaps.forEach((boneMap) => {
        boneMap.forEach((bone, jointName) => {
          if (jointName.includes(pattern) || pattern === 'all') {
            const current = this.currentWeights.get(jointName) || 0;
            const damped = current + (targetWeight - current) * this.dampingFactor;
            this.currentWeights.set(jointName, damped);
          }
        });
      });
    });
  }

  // Blend between WebXR tracked pose and IK target using damped weights + SLERP
  blendBone(
    bone: THREE.Bone, 
    trackedQuat: THREE.Quaternion, 
    ikQuat: THREE.Quaternion, 
    jointName: string
  ) {
    const weight = this.currentWeights.get(jointName) || 0.0;
    
    // SLERP for rotation blending
    const blendedQuat = trackedQuat.clone().slerp(ikQuat, weight);
    bone.quaternion.copy(blendedQuat);
    
    bone.updateMatrixWorld(true);
  }

  // Main update called every frame
  update(handSide: 'left' | 'right', webxrHand: any, fabrikResults?: Map<string, THREE.Quaternion>) {
    this.updateDampedWeights();

    const boneMap = this.boneMaps.get(handSide);
    if (!boneMap || !webxrHand) return;

    boneMap.forEach((bone, jointName) => {
      const joint = webxrHand.joints?.find((j: any) => j.jointName === jointName);
      if (!joint) return;

      const trackedQuat = new THREE.Quaternion().setFromRotationMatrix(joint.matrix);
      const ikQuat = fabrikResults?.get(jointName) || trackedQuat;

      this.blendBone(bone, trackedQuat, ikQuat, jointName);
    });
  }

  // Convenience: Trigger high IK weight on fingers when strong pinch detected
  triggerAgencyReach(isActive: boolean) {
    const weight = isActive ? 0.85 : 0.15; // High IK influence during agency action
    this.setTargetWeight('finger', weight);
  }

  // "Be Like Water" flow mode — lower damping for more fluid response
  setFlowMode(active: boolean) {
    this.dampingFactor = active ? 0.28 : 0.18; // Faster response when flowing
  }
}
