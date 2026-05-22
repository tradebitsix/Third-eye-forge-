import * as THREE from 'three';

class SpatialSynthManager {
  private audioCtx: AudioContext | null = null;
  private isInitialized = false;

  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneStarted = false;

  init() {
    if (this.isInitialized) return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
      this.audioCtx = new Ctx();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch((e: any) => console.warn(e));
      }
      this.isInitialized = true;
    }
  }

  updateListener(camera: THREE.Camera) {
    if (!this.audioCtx) return;
    const listener = this.audioCtx.listener;
    
    // Update position
    if (listener.positionX) {
      listener.positionX.value = camera.position.x;
      listener.positionY.value = camera.position.y;
      listener.positionZ.value = camera.position.z;
    } else if (listener.setPosition) {
      listener.setPosition(camera.position.x, camera.position.y, camera.position.z);
    }
    
    // Update orientation
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    
    if (listener.forwardX) {
      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
      listener.upX.value = up.x;
      listener.upY.value = up.y;
      listener.upZ.value = up.z;
    } else if (listener.setOrientation) {
      listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  updateDrone(numHealed: number, totalNodes: number) {
    if (!this.audioCtx) this.init();
    if (!this.audioCtx) return;

    if (!this.droneStarted) {
      const now = this.audioCtx.currentTime;

      this.droneOsc1 = this.audioCtx.createOscillator();
      this.droneOsc2 = this.audioCtx.createOscillator();
      this.droneGain = this.audioCtx.createGain();
      this.droneFilter = this.audioCtx.createBiquadFilter();

      this.droneOsc1.type = 'sine';
      this.droneOsc2.type = 'triangle';

      this.droneFilter.type = 'lowpass';
      this.droneFilter.frequency.value = 300; // start muted

      // Connect graph
      this.droneOsc1.connect(this.droneGain);
      this.droneOsc2.connect(this.droneGain);
      this.droneGain.connect(this.droneFilter);
      this.droneFilter.connect(this.audioCtx.destination);

      // Initial state
      this.droneGain.gain.setValueAtTime(0, now);
      this.droneOsc1.frequency.setValueAtTime(55, now); // Low A1
      this.droneOsc2.frequency.setValueAtTime(55 * 1.5, now); // Perfect fifth E2

      this.droneOsc1.start(now);
      this.droneOsc2.start(now);
      this.droneStarted = true;
    }

    if (!this.droneOsc1 || !this.droneOsc2 || !this.droneGain || !this.droneFilter) return;

    const progress = totalNodes > 0 ? numHealed / totalNodes : 0;
    const now = this.audioCtx.currentTime;

    // As progress increases:
    // 1. Base frequency shifts up an octave or complex ratio
    // 2. Filter opens up (more harmonics)
    // 3. Volume swells slightly, then drops if 100% healed (optional, maybe keep it humm)

    const baseFreq = 55 + progress * 55; // 55 to 110 Hz
    const fifthRatio = 1.5 + progress * 0.01; // subtle detune
    
    // Smooth transition
    this.droneOsc1.frequency.setTargetAtTime(baseFreq, now, 1.0);
    this.droneOsc2.frequency.setTargetAtTime(baseFreq * fifthRatio, now, 1.0);
    
    const filterFreq = 300 + progress * 1500;
    this.droneFilter.frequency.setTargetAtTime(filterFreq, now, 1.0);

    const targetVol = progress === 0 ? 0 : progress === 1 ? 0.05 : 0.1 + progress * 0.1;
    this.droneGain.gain.setTargetAtTime(targetVol, now, 2.0);
  }

  playFlare(position: THREE.Vector3) {
    if (!this.audioCtx) this.init();
    if (!this.audioCtx) return;
    
    const panner = this.createPanner(position);
    
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc1.type = 'sine';
    osc2.type = 'triangle';
    
    const now = this.audioCtx.currentTime;
    
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.setTargetAtTime(600, now + 0.1, 0.2);
    
    osc2.frequency.setValueAtTime(200, now);
    osc2.frequency.setTargetAtTime(800, now + 0.1, 0.2);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(panner);
    panner.connect(this.audioCtx.destination);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.0);
    osc2.stop(now + 2.0);
  }

  playInteract(position: THREE.Vector3, type: 'grab' | 'drop' | 'hover' = 'hover') {
    if (!this.audioCtx) this.init();
    if (!this.audioCtx) return;
    
    const panner = this.createPanner(position);
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    const now = this.audioCtx.currentTime;
    
    if (type === 'hover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'grab') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'drop') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }

    // A low-pass filter to make it sound less harsh
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(panner);
    panner.connect(this.audioCtx.destination);
  }

  private createPanner(position: THREE.Vector3): PannerNode {
    if (!this.audioCtx) throw new Error("AudioContext not initialized");
    const panner = this.audioCtx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 2;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    
    if (panner.positionX) {
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;
    } else if (panner.setPosition) {
      panner.setPosition(position.x, position.y, position.z);
    }
    
    return panner;
  }
}

export const spatialAudio = new SpatialSynthManager();
