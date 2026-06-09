import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Intersecting Sacred Geometry Rings representing the "Flower of Life" in a 3D hologram
export function FlowerOfLifeNode({ 
  position, 
  color = '#eab308', 
  scale = 1 
}: { 
  position: [number, number, number], 
  color?: string, 
  scale?: number 
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15;
      groupRef.current.rotation.z = Math.sin(t * 0.25) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Outer master ring */}
      <mesh>
        <torusGeometry args={[1.2 * scale, 0.02 * scale, 12, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* Six intersecting geometric petals structure */}
      {Array.from({ length: 6 }).map((_, idx) => {
        const radians = (idx / 6) * Math.PI * 2;
        const xOffset = Math.sin(radians) * 0.6 * scale;
        const yOffset = Math.cos(radians) * 0.6 * scale;

        return (
          <mesh key={idx} position={[xOffset, yOffset, 0]}>
            <torusGeometry args={[0.6 * scale, 0.015 * scale, 8, 36]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
        );
      })}

      {/* Spinning Sacred Central Star Polyhedron Core */}
      <mesh>
        <dodecahedronGeometry args={[0.22 * scale]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive={color} 
          emissiveIntensity={1.2} 
          wireframe 
        />
      </mesh>
    </group>
  );
}

// Complex Torus Knot / Portal Helix above key segments
export function MysticalTorusKnot({ 
  position, 
  color = '#a855f7' 
}: { 
  position: [number, number, number], 
  color?: string 
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.4;
      meshRef.current.rotation.y = t * 0.6;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusKnotGeometry args={[0.5, 0.04, 64, 8, 3, 5]} />
      <meshStandardMaterial 
        color="#ffffff" 
        emissive={color} 
        emissiveIntensity={0.8} 
        roughness={0.1}
        metalness={0.9}
        wireframe
      />
    </mesh>
  );
}
