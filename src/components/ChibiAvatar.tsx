import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ChibiAvatar({ texture, texScaleX, texScaleY, scaleZ }: any) {
  const groupRef = useRef<THREE.Group>(null);

  // Rotate slowly 360 degrees
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
    }
  });

  const wireMaterial = new THREE.MeshBasicMaterial({
    color: '#00ffff',
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });

  const solidGlassMaterial = new THREE.MeshStandardMaterial({
    color: '#004488',
    transparent: true,
    opacity: 0.8,
    roughness: 0.1,
    metalness: 0.8,
  });

  const hologramMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      roughness: 0.3,
      metalness: 0.6,
      side: THREE.DoubleSide
  });

  return (
    <group ref={groupRef}>
      {/* 2.5D Volumetric Stack Extrusion of the Uploaded Image */}
      {texture && (
          <group position={[0, scaleZ * 0.1, 0]}>
            {Array.from({ length: 25 }).map((_, i) => {
              const zOffset = (i - 12) * (scaleZ * 0.6 / 25);
              const isOuter = i === 0 || i === 24;
              return (
                  <mesh key={i} position={[0, 0, zOffset]} castShadow receiveShadow>
                  <planeGeometry args={[texScaleX * 0.9, texScaleY * 0.9]} />
                  <meshStandardMaterial 
                      map={texture} 
                      transparent={true}
                      alphaTest={0.15}
                      side={THREE.DoubleSide}
                      roughness={isOuter ? 0.3 : 0.8}
                      metalness={isOuter ? 0.6 : 0.2}
                      color={isOuter ? "#ffffff" : "#cccccc"}
                  />
                  </mesh>
              );
            })}
          </group>
      )}

      {/* Holographic Container / Skeleton Box around it to show the 3D bounds */}
      <mesh position={[0, scaleZ * 0.1, 0]}>
        <boxGeometry args={[texScaleX * 1.0, texScaleY * 1.0, scaleZ * 0.8]} />
        <meshBasicMaterial 
          color="#00aaff"
          wireframe={true}
          transparent={true}
          opacity={0.1}
        />
      </mesh>

      {/* Blueprint Grid Base */}
      <gridHelper args={[Math.max(texScaleX * 1.5, scaleZ * 1.5), 10, '#00ffcc', '#004466']} position={[0, -(texScaleY * 0.45) + scaleZ * 0.1, 0]} />
      <axesHelper args={[texScaleX * 0.6]} />
    </group>
  );
}
