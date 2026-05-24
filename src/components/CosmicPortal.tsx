import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface CosmicPortalProps {
  position: [number, number, number];
  scale?: number;
  label: string;
  targetRoom: string;
  onEnter: (room: string) => void;
  imageTextureUrl?: string; // for dynamic logo/content
}

export default function CosmicPortal({ position, scale = 1, label, targetRoom, onEnter, imageTextureUrl }: CosmicPortalProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const vortexRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (groupRef.current) {
        groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1; // gentle mystical float
    }
    if (vortexRef.current) {
        vortexRef.current.rotation.z = state.clock.getElapsedTime() * 0.4;
    }
  });

  const handleEnter = () => {
    // Smooth camera push + transition
    onEnter(targetRoom);
  };

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Nebula backdrop */}
      <mesh position={[0, 0, -0.2]}>
        <planeGeometry args={[4*scale, 5.5*scale]} />
        <meshBasicMaterial color="#1a0033" transparent opacity={0.7} />
      </mesh>

      {/* Main glowing panel */}
      <mesh onClick={handleEnter} onDoubleClick={handleEnter}>
        <planeGeometry args={[2.8*scale, 4.2*scale]} />
        <meshStandardMaterial emissive="#00ffff" emissiveIntensity={0.5} roughness={0.05} metalness={0.95} color="#000" />
      </mesh>

      {/* Floating cubes orbit */}
      {Array.from({length: 8}).map((_, i) => (
        <mesh key={i} position={[
          Math.sin(i * 1.5) * 2.2 * scale,
          Math.cos(i) * 1.8 * scale,
          -1 + Math.random()
        ]}>
          <boxGeometry args={[0.25*scale, 0.25*scale, 0.25*scale]} />
          <meshStandardMaterial color="#a5f3fc" emissive="#00ffff" wireframe />
        </mesh>
      ))}

      {/* Dynamic Text / Logo */}
      <Text position={[0, 0.3*scale, 0.1]} fontSize={0.4*scale} color="#67e8f9" anchorX="center" maxWidth={2.5 * scale} textAlign="center">
        {label}
      </Text>

      {/* Vortex */}
      <group ref={vortexRef}>
        <mesh>
          <torusGeometry args={[1.6*scale, 0.12*scale, 12, 48]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  );
}
