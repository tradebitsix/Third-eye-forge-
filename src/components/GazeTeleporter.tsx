import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface GazeTeleporterProps {
  controlsRef: React.RefObject<any>;
}

export function GazeTeleporter({ controlsRef }: GazeTeleporterProps) {
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const hoverPoint = useRef<THREE.Vector3>(new THREE.Vector3(0, -1, 0));
  const reticleColor = useRef<string>('#00ffcc');

  // Animation targets for the smooth "ice skating" movement
  const isGliding = useRef<boolean>(false);
  const glideTargetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, -1, 0));
  const glideTargetCamPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 2, 7));

  // Visual reticle components
  const ringRef1 = useRef<THREE.Mesh>(null!);
  const ringRef2 = useRef<THREE.Mesh>(null!);
  const glowDotRef = useRef<THREE.Mesh>(null!);

  // XR Controller and Teleporter Arc Components
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const [hasArc, setHasArc] = useState(false);
  const lastIntersectPoint = useRef<THREE.Vector3 | null>(null);
  const triggerWasPressedRef = useRef(false);
  const dummyPoints = useMemo(() => [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)], []);

  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.setFromPoints(dummyPoints);
    }
  }, [dummyPoints]);

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (e.point) {
      hoverPoint.current.copy(e.point);
      setHovered(true);
    }
  };

  const handlePointerOut = () => {
    setHovered(false);
  };

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (!e.point || !controlsRef.current) return;

    const clickedPoint = e.point.clone();
    
    // Smooth navigation target
    const targetLookAt = clickedPoint.clone();
    // Keep it slightly elevated above the floor for comfortable gaze center
    targetLookAt.y = -0.5;

    // Retain the current viewing angle/zoom offset relative to looking direction
    const currentLookAt = controlsRef.current.target.clone();
    const offset = camera.position.clone().sub(currentLookAt);

    // Set new target states
    glideTargetLookAt.current.copy(targetLookAt);
    glideTargetCamPos.current.copy(targetLookAt.clone().add(offset));
    isGliding.current = true;
  };

  useFrame((state, delta) => {
    const isXR = gl.xr && gl.xr.isPresenting;

    // 1. WebXR Controller Arc Pointer and Teleportation
    if (isXR) {
      const c0 = gl.xr.getController(0);
      const c1 = gl.xr.getController(1);
      const controllers = [c0, c1].filter(c => c && c.visible) as THREE.Group[];
      
      let intersected = false;
      const points: THREE.Vector3[] = [];
      const intersectPoint = new THREE.Vector3();

      for (const ctrl of controllers) {
        const pos = new THREE.Vector3();
        ctrl.getWorldPosition(pos);
        
        // Compute forward direction vector (-Z) in target ray space
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(ctrl.quaternion);
        
        // Trace curved projectile trajectory
        let currentPos = pos.clone();
        let currentVel = dir.clone().multiplyScalar(14); // Shoot velocity
        const dt = 0.03;
        const gravity = -9.8;
        
        points.length = 0; // reset
        
        for (let step = 0; step < 40; step++) {
          points.push(currentPos.clone());
          const nextPos = currentPos.clone().addScaledVector(currentVel, dt);
          currentVel.y += gravity * dt;
          
          // Floor level intersection
          if (nextPos.y <= -0.99 && currentPos.y > -0.99) {
            const ratio = (-0.99 - currentPos.y) / (nextPos.y - currentPos.y);
            intersectPoint.lerpVectors(currentPos, nextPos, ratio);
            points.push(intersectPoint.clone());
            intersected = true;
            break;
          }
          currentPos = nextPos;
        }
        
        if (intersected) break;
      }

      if (intersected) {
        lastIntersectPoint.current = intersectPoint.clone();
        hoverPoint.current.copy(intersectPoint);
        setHovered(true);
        setHasArc(true);

        if (geometryRef.current) {
          geometryRef.current.setFromPoints(points);
        }

        // Check WebXR gamepad inputs for trigger button
        const session = gl.xr.getSession();
        let triggerPressed = false;
        if (session && session.inputSources) {
          for (const source of session.inputSources) {
            if (source.gamepad) {
              const trigger = source.gamepad.buttons[0]; // Button 0 is standard trigger
              if (trigger && trigger.pressed) {
                triggerPressed = true;
                break;
              }
            }
          }
        }

        // Handle trigger click (rising edge transition)
        if (triggerPressed) {
          if (!triggerWasPressedRef.current) {
            const targetRig = camera.parent || camera;
            const offset = camera.position.clone();
            offset.y = 0; // Keep floor elevation
            
            // Perform instant XR coordinate space translation
            targetRig.position.copy(lastIntersectPoint.current).sub(offset);
            
            // Keep OrbitControls and visual camera state synchronized
            if (controlsRef.current) {
              controlsRef.current.target.copy(lastIntersectPoint.current);
              controlsRef.current.update();
            }
            triggerWasPressedRef.current = true;
          }
        } else {
          triggerWasPressedRef.current = false;
        }
      } else {
        setHovered(false);
        setHasArc(false);
      }
    } else {
      // Not in XR, disable controller arc line
      if (hasArc) setHasArc(false);
    }

    // 2. Handle visual Reticle tracking and hover pulse
    if (ringRef1.current && ringRef2.current && glowDotRef.current) {
      if (hovered) {
        // Smoothly slide reticle meshes to pointer point
        ringRef1.current.position.lerp(hoverPoint.current, 0.2);
        ringRef2.current.position.lerp(hoverPoint.current, 0.2);
        glowDotRef.current.position.lerp(hoverPoint.current, 0.2);

        // Slow hover pulse animation
        const pulse = 1.0 + Math.sin(state.clock.getElapsedTime() * 4) * 0.15;
        ringRef1.current.scale.set(pulse, pulse, 1);
        ringRef2.current.scale.set(pulse * 0.5, pulse * 0.5, 1);

        ringRef1.current.visible = true;
        ringRef2.current.visible = true;
        glowDotRef.current.visible = true;
      } else {
        ringRef1.current.visible = false;
        ringRef2.current.visible = false;
        glowDotRef.current.visible = false;
      }
    }

    // 3. Perform smooth camera skating interpolation (desktop client only)
    if (!isXR && isGliding.current && controlsRef.current) {
      const controls = controlsRef.current;
      
      // Ice skating flow damping lerping factor (adjustable for friction feel)
      const lerpFactor = 0.05; 

      camera.position.lerp(glideTargetCamPos.current, lerpFactor);
      controls.target.lerp(glideTargetLookAt.current, lerpFactor);
      controls.update();

      // Check distance thresholds to stop interpolation when close
      const distCam = camera.position.distanceTo(glideTargetCamPos.current);
      const distTarget = controls.target.distanceTo(glideTargetLookAt.current);
      if (distCam < 0.02 && distTarget < 0.02) {
        isGliding.current = false;
      }
    }
  });

  return (
    <group>
      {/* Dynamic 3D Curved Teleportation Arc for XR controllers */}
      {hasArc && (
        <line>
          <bufferGeometry ref={geometryRef} />
          <lineBasicMaterial 
            color="#00ffcc" 
            linewidth={3} 
            transparent 
            opacity={0.85} 
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </line>
      )}

      {/* Invisible Interactive Floor Senser covering gridHelper plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.99, 0]}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[65, 65]} />
        <meshBasicMaterial visible={false} color="#000000" />
      </mesh>

      {/* Cyber-Gaze Navigation Reticle Ring */}
      <mesh ref={ringRef1} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, 0]} visible={false}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial 
          color="#00ffcc" 
          transparent 
          opacity={0.8} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Inner gaze target hub */}
      <mesh ref={ringRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, 0]} visible={false}>
        <ringGeometry args={[0.08, 0.12, 16]} />
        <meshBasicMaterial 
          color="#0088ff" 
          transparent 
          opacity={0.6} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Center energy point */}
      <mesh ref={glowDotRef} position={[0, -0.97, 0]} visible={false}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.9} 
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
