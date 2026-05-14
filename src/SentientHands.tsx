'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MarkleyQuaternionAverager } from './markleyQuaternionAverager';

export default function SentientHands({ 
  qiIntensity,
  onPinch
}: { 
  qiIntensity: number,
  onPinch: (pos: THREE.Vector3) => void
}) {
  const { gl } = useThree();
  const averager = useMemo(() => new MarkleyQuaternionAverager(), []);

  // Initialize XR controllers once to avoid XRSpace/XRFrame mismatches across sessions
  const xrControllers = useMemo(() => {
    return {
      c0: gl.xr.getController(0),
      c1: gl.xr.getController(1),
      hand0: gl.xr.getHand(0),
      hand1: gl.xr.getHand(1)
    };
  }, [gl]);

  const leftHandRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);
  const qiBallRef = useRef<THREE.Mesh>(null);
  const pinchTriggered = useRef(false);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // -------------------------------------------------------------
    // TRIPLE-BLEND SYSTEM COMPONENT 1: RAW WEBXR BASELINE
    // Serves as the ground-truth root tracking for native presence.
    // Native hand-tracking reads from gl.xr API directly without MediaPipe.
    // -------------------------------------------------------------
    let leftPos = new THREE.Vector3(-0.5, 1, -1);
    let rightPos = new THREE.Vector3(0.5, 1, -1);
    let leftQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI/4, 0));
    let rightQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI/4, 0));

    let pinchDetectedThisFrame = false;

    if (gl.xr && gl.xr.isPresenting) {
      const session = gl.xr.getSession();
      if (session) {
        try {
          const { c0, c1, hand0, hand1 } = xrControllers;

      if (c0?.visible && c1?.visible) {
         leftPos.copy(c0.position);
         rightPos.copy(c1.position);
         leftQuat.copy(c0.quaternion);
         rightQuat.copy(c1.quaternion);
      } else {
        // Fallback if hands are overriding controllers
        if (hand0?.visible) {
          leftPos.addVectors(hand0.position, new THREE.Vector3(0, 0, 0));
          leftQuat.copy(hand0.quaternion);
        }
        if (hand1?.visible) {
          rightPos.addVectors(hand1.position, new THREE.Vector3(0, 0, 0));
          rightQuat.copy(hand1.quaternion);
        }
      }

      // WebXR Hand Joint Pinch Detection (thumb-tip is 4, index-tip is 9)
      [hand0, hand1].forEach((hand) => {
        if (hand && hand.visible && hand.children.length >= 25) {
          const thumbTip = hand.children[4];
          const indexTip = hand.children[9];
          
          if (thumbTip && indexTip) {
            const tPos = new THREE.Vector3().setFromMatrixPosition(thumbTip.matrixWorld);
            const iPos = new THREE.Vector3().setFromMatrixPosition(indexTip.matrixWorld);
            
            // "I Control Me" Pinch Threshold
            if (tPos.distanceTo(iPos) < 0.05) {
               pinchDetectedThisFrame = true;
               if (!pinchTriggered.current) {
                 onPinch(tPos.clone().lerp(iPos, 0.5));
               }
            }
          }
        }
      });

      // Fallback for VR Controllers (using trigger)
      if (!pinchDetectedThisFrame && session.inputSources) {
        session.inputSources.forEach((source) => {
           if (source.gamepad) {
              const trigger = source.gamepad.buttons[0]; // Trigger button
              if (trigger && trigger.pressed) {
                 pinchDetectedThisFrame = true;
                 if (!pinchTriggered.current) {
                    const idx = source.handedness === 'left' ? 0 : 1;
                    const ctrl = gl.xr.getController(idx);
                    if (ctrl && ctrl.visible) {
                      onPinch(new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld));
                    }
                 }
              }
           }
        });
      }

      if (pinchDetectedThisFrame) {
        pinchTriggered.current = true;
      } else {
        pinchTriggered.current = false;
      }
        } catch(e) {
          console.warn("XR Tracking error", e);
        }
      }
    } else {
       // Graceful Desktop Fallback
       leftPos.y += Math.sin(time) * 0.1;
       rightPos.y += Math.cos(time) * 0.1;

       // Mock pinch mechanics out-of-VR (auto cycles every 5s)
       if (Math.floor(time) % 5 === 0 && !pinchTriggered.current) {
         onPinch(leftPos.clone().lerp(rightPos, 0.5));
         pinchTriggered.current = true;
       } else if (Math.floor(time) % 5 !== 0) {
         pinchTriggered.current = false;
       }
    }

    // -------------------------------------------------------------
    // TRIPLE-BLEND SYSTEM COMPONENT 2: FABRIK IK LAYER
    // "Magnetic Pull": Generates a quaternion pulled toward agency nodes
    // representing "magnetic focus" on escaping loops.
    // -------------------------------------------------------------
    const centerTarget = new THREE.Vector3(0, 1.5, -2);
    // IK influence scales with user's core intensity
    const ikWeight = 0.3 * qiIntensity; 
    
    // Calculate FK lookAt orientations imitating an IK root pull
    const leftM = new THREE.Matrix4().lookAt(leftPos, centerTarget, new THREE.Vector3(0,1,0));
    const leftIKQuat = new THREE.Quaternion().setFromRotationMatrix(leftM);
    
    const rightM = new THREE.Matrix4().lookAt(rightPos, centerTarget, new THREE.Vector3(0,1,0));
    const rightIKQuat = new THREE.Quaternion().setFromRotationMatrix(rightM);

    // -------------------------------------------------------------
    // TRIPLE-BLEND SYSTEM COMPONENT 3: QI SWAY (Be Like Water)
    // Procedural noise breathing layers organicity onto rigid tracking.
    // -------------------------------------------------------------
    const qiQuatL = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.sin(time * 2) * 0.1, Math.cos(time * 2) * 0.1, 0)
    );
    const qiQuatR = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.cos(time * 2) * 0.1, Math.sin(time * 2) * 0.1, 0)
    );

    // -------------------------------------------------------------
    // MARKLEY QUATERNION AVERAGING: Resolves gimbal lock interpolations
    // Cleanly fuses XR Reality + IK Magnetism + Water Flow into one pose.
    // -------------------------------------------------------------
    averager.clear();
    averager.addSource(leftQuat, 0.7);        // 70% Ground Truth
    averager.addSource(leftIKQuat, ikWeight); // Contextual IK Pull
    averager.addSource(qiQuatL, 0.2);         // 20% Fluid Sway
    const finalLeftQuat = averager.computeAverage();

    averager.clear();
    averager.addSource(rightQuat, 0.7);
    averager.addSource(rightIKQuat, ikWeight);
    averager.addSource(qiQuatR, 0.2);
    const finalRightQuat = averager.computeAverage();

    // -------------------------------------------------------------
    // APPLY FINAL POSTURE
    // -------------------------------------------------------------
    if (leftHandRef.current) {
      leftHandRef.current.position.copy(leftPos);
      leftHandRef.current.quaternion.copy(finalLeftQuat);
    }
    if (rightHandRef.current) {
      rightHandRef.current.position.copy(rightPos);
      rightHandRef.current.quaternion.copy(finalRightQuat);
    }

    // Qi Ball expands based on hand distance bridging together
    if (qiBallRef.current) {
      const dist = leftPos.distanceTo(rightPos);
      qiBallRef.current.position.copy(leftPos.clone().lerp(rightPos, 0.5));
      qiBallRef.current.scale.setScalar(0.1 + (1 - Math.min(dist, 1)) * 0.2 * qiIntensity);
    }
  });

  return (
    <>
      <group ref={leftHandRef}>
        <mesh>
          <sphereGeometry args={[0.08]} />
          <meshStandardMaterial color="#00ffff" wireframe emissive="#00ffff" emissiveIntensity={qiIntensity} />
        </mesh>
      </group>
      <group ref={rightHandRef}>
        <mesh>
          <sphereGeometry args={[0.08]} />
          <meshStandardMaterial color="#00ffff" wireframe emissive="#00ffff" emissiveIntensity={qiIntensity} />
        </mesh>
      </group>
      <mesh ref={qiBallRef}>
         <sphereGeometry args={[1]} />
         <meshBasicMaterial color="#aaffff" transparent opacity={0.4} />
      </mesh>
    </>
  );
}
