import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ShockwaveRingProps {
  startTime: number;
}

function ShockwaveRing({ startTime }: ShockwaveRingProps) {
  const ringRef1 = useRef<THREE.Mesh>(null!);
  const ringRef2 = useRef<THREE.Mesh>(null!);
  const sphereRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    // Math to determine time since shockwave triggered
    const age = (Date.now() - startTime) / 1000; // in seconds
    const duration = 2.2; // 2.2 seconds to fully fade and expand
    const t = Math.min(age / duration, 1.0);

    // Cubic ease-out: expands fast at the start, slows down at the end
    const easeOut = 1 - Math.pow(1 - t, 3);
    const scale = easeOut * 14.0; // expand up to 14 units radially
    const opacity = 1.0 - t; // linear fade out

    // Ring 1: Main horizontal wave ring in the X-Z plane
    if (ringRef1.current) {
      ringRef1.current.scale.set(scale, scale, 1);
      const material = ringRef1.current.material as THREE.MeshBasicMaterial;
      material.opacity = opacity * 0.95;
    }

    // Ring 2: Inner complementary ring with a slight angle
    if (ringRef2.current) {
      ringRef2.current.scale.set(scale * 0.75, scale * 0.75, 1);
      const material = ringRef2.current.material as THREE.MeshBasicMaterial;
      material.opacity = opacity * 0.6;
    }

    // Sphere: 3D wireframe atomic bubble bursting outward
    if (sphereRef.current) {
      sphereRef.current.scale.setScalar(scale * 0.5);
      const material = sphereRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = opacity * 0.25;
    }
  });

  return (
    <group position={[0, -1, -5]}>
      {/* Plane-aligned expanding ring */}
      <mesh ref={ringRef1} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.02, 1.0, 128]} />
        <meshBasicMaterial 
          color="#00ffcc" 
          transparent 
          opacity={0.9} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
          side={THREE.DoubleSide} 
          toneMapped={false}
        />
      </mesh>

      {/* Secondary offset ring for density */}
      <mesh ref={ringRef2} rotation={[-Math.PI / 2, 0.1, 0.1]}>
        <ringGeometry args={[0.02, 1.0, 96]} />
        <meshBasicMaterial 
          color="#0088ff" 
          transparent 
          opacity={0.6} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
          side={THREE.DoubleSide} 
          toneMapped={false}
        />
      </mesh>

      {/* Polyhedral / spherical shell representing atomic resonance */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1.0, 24, 24]} />
        <meshBasicMaterial 
          color="#00ffcc" 
          transparent 
          opacity={0.3} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
          wireframe
          toneMapped={false}
        />
      </mesh>

      {/* A dense center flash sphere that grows and disappears quickly */}
      <mesh scale={Math.max(0, 1 - (Date.now() - startTime) / 300) * 1.5}>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

interface ForgeShockwaveProps {
  triggers: { id: number; time: number }[];
}

export function ForgeShockwave({ triggers }: ForgeShockwaveProps) {
  return (
    <group>
      {triggers.map((trigger) => (
        <ShockwaveRing key={trigger.id} startTime={trigger.time} />
      ))}
    </group>
  );
}
