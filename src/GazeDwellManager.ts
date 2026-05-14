import * as THREE from 'three';

export class GazeDwellManager {
  private raycaster: THREE.Raycaster;
  private reticle: THREE.Mesh;
  private progressRing: THREE.Mesh;
  private currentTarget: THREE.Object3D | null = null;
  private dwellStartTime: number = 0;
  private dwellDuration: number = 1.8;
  private isDwelling: boolean = false;

  private interactiveObjects: THREE.Object3D[] = [];
  private onTriggerCallback: (target: THREE.Object3D) => void;

  constructor(scene: THREE.Scene, camera: THREE.Camera, onTrigger: (target: THREE.Object3D) => void) {
    this.raycaster = new THREE.Raycaster();
    this.onTriggerCallback = onTrigger;

    const reticleGeo = new THREE.RingGeometry(0.015, 0.025, 64);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthTest: false
    });
    this.reticle = new THREE.Mesh(reticleGeo, reticleMat);
    this.reticle.renderOrder = 999;
    scene.add(this.reticle);

    const progressGeo = new THREE.RingGeometry(0.026, 0.032, 64);
    const progressMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false
    });
    this.progressRing = new THREE.Mesh(progressGeo, progressMat);
    this.progressRing.renderOrder = 998;
    scene.add(this.progressRing);

    this.reticle.position.set(0, 0, -0.8);
    this.progressRing.position.copy(this.reticle.position);
  }

  public setInteractiveObjects(objects: THREE.Object3D[]) {
    this.interactiveObjects = objects;
  }

  public update(camera: THREE.Camera, delta: number, isXR: boolean) {
    if (!isXR) {
      this.reticle.visible = false;
      this.progressRing.visible = false;
      return;
    }
    this.reticle.visible = true;
    this.progressRing.visible = true;

    // Center reticle
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    
    this.reticle.position.copy(camera.position).add(camDir.multiplyScalar(0.8));
    this.reticle.quaternion.copy(camera.quaternion);
    this.progressRing.position.copy(this.reticle.position);
    this.progressRing.quaternion.copy(this.reticle.quaternion);

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      const hitObject = intersects[0].object;

      if (hitObject !== this.currentTarget) {
        this.resetDwell();
        this.currentTarget = hitObject;
        this.dwellStartTime = Date.now();
        this.isDwelling = true;
      }

      const elapsed = (Date.now() - this.dwellStartTime) / 1000;

      if (elapsed >= this.dwellDuration) {
        this.triggerAction(hitObject);
        this.resetDwell();
      } else {
        const progress = Math.min(elapsed / this.dwellDuration, 1);
        (this.progressRing.material as THREE.Material).opacity = progress * 0.9;
        this.progressRing.scale.setScalar(1 + progress * 0.3);
      }
    } else {
      this.resetDwell();
    }
  }

  private resetDwell() {
    this.currentTarget = null;
    this.isDwelling = false;
    if (this.progressRing.material) {
        (this.progressRing.material as THREE.Material).opacity = 0;
    }
    this.progressRing.scale.setScalar(1);
  }

  private triggerAction(target: THREE.Object3D) {
    this.onTriggerCallback(target);
  }

  public dispose() {
    this.reticle.geometry.dispose();
    (this.reticle.material as THREE.Material).dispose();
    this.progressRing.geometry.dispose();
    (this.progressRing.material as THREE.Material).dispose();
  }
}
