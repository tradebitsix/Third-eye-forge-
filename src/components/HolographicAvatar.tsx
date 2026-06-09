import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function HolographicAvatar({ texture, texScaleX, texScaleY, scaleZ }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  
  // Use a bobbing animation and slow rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 2;
    }
    if (ring1Ref.current) {
        ring1Ref.current.rotation.z -= 0.02;
    }
    if (ring2Ref.current) {
        ring2Ref.current.rotation.z += 0.015;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Sci-Fi Floating Energy Rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]} position={[0, -texScaleY * 0.9, 0]}>
        <ringGeometry args={[texScaleX * 0.8, texScaleX * 0.85, 32]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0, 0]} position={[0, -texScaleY * 0.9, 0]}>
        <ringGeometry args={[texScaleX * 0.9, texScaleX * 0.92, 32]} />
        <meshBasicMaterial color="#00ffcc" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Volumetric Stack Extrusion of the Uploaded Image */}
      {texture && (
          <group position={[0, scaleZ * 0.2, 0]}>
            {Array.from({ length: 15 }).map((_, i) => {
              const zOffset = (i - 7) * (scaleZ * 0.8 / 15);
              const isOuter = i === 0 || i === 14;
              return (
                  <mesh key={i} position={[0, 0, zOffset]} castShadow receiveShadow>
                  <planeGeometry args={[texScaleX * 0.85, texScaleY * 0.85]} />
                  <meshStandardMaterial 
                      map={texture} 
                      transparent={true}
                      alphaTest={0.15}
                      side={THREE.DoubleSide}
                      roughness={isOuter ? 0.3 : 0.8}
                      metalness={isOuter ? 0.6 : 0.2}
                      color={isOuter ? "#ffffff" : "#bbbbbb"}
                      opacity={isOuter ? 1 : 0.6}
                  />
                  </mesh>
              );
            })}
          </group>
      )}

      {/* --- Skeletal Joints & Blueprint Nodes --- */}
      {/* Outer Encasing Holographic Bounding Box */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[texScaleX * 0.9, texScaleY * 0.9, scaleZ * 0.9]} />
        <meshBasicMaterial 
          color="#00aaff"
          wireframe={true}
          transparent={true}
          opacity={0.15}
        />
      </mesh>

      {/* Avatar Limbs (connecting logic) */}
      
      {/* Neck */}
      <mesh position={[0, texScaleY * 0.25, 0]}>
        <cylinderGeometry args={[texScaleX * 0.05, texScaleX * 0.05, texScaleY * 0.2, 8]} />
        <meshBasicMaterial color="#00ffff" wireframe={true} transparent={true} opacity={0.3} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, -(texScaleY * 0.05), 0]}>
        <cylinderGeometry args={[texScaleX * 0.25, texScaleX * 0.15, texScaleY * 0.6, 12]} />
        <meshBasicMaterial color="#00ffff" wireframe={true} transparent={true} opacity={0.15} />
      </mesh>

      {/* Upper Arms */}
      <mesh position={[-(texScaleX * 0.35), texScaleY * 0.05, 0]} rotation={[0, 0, Math.PI / 8]}>
        <cylinderGeometry args={[texScaleX * 0.05, texScaleX * 0.04, texScaleY * 0.25]} />
        <meshBasicMaterial color="#ff00ff" wireframe={true} transparent={true} opacity={0.4} />
      </mesh>
      <mesh position={[(texScaleX * 0.35), texScaleY * 0.05, 0]} rotation={[0, 0, -Math.PI / 8]}>
        <cylinderGeometry args={[texScaleX * 0.05, texScaleX * 0.04, texScaleY * 0.25]} />
        <meshBasicMaterial color="#ff00ff" wireframe={true} transparent={true} opacity={0.4} />
      </mesh>

      {/* Lower Arms */}
      <mesh position={[-(texScaleX * 0.43), -(texScaleY * 0.15), 0]} rotation={[0, 0, Math.PI / 16]}>
        <cylinderGeometry args={[texScaleX * 0.04, texScaleX * 0.03, texScaleY * 0.25]} />
        <meshBasicMaterial color="#00ffcc" wireframe={true} transparent={true} opacity={0.4} />
      </mesh>
      <mesh position={[(texScaleX * 0.43), -(texScaleY * 0.15), 0]} rotation={[0, 0, -Math.PI / 16]}>
        <cylinderGeometry args={[texScaleX * 0.04, texScaleX * 0.03, texScaleY * 0.25]} />
        <meshBasicMaterial color="#00ffcc" wireframe={true} transparent={true} opacity={0.4} />
      </mesh>

      {/* Thighs */}
      <mesh position={[-(texScaleX * 0.15), -(texScaleY * 0.42), 0]}>
        <cylinderGeometry args={[texScaleX * 0.06, texScaleX * 0.05, texScaleY * 0.35]} />
        <meshBasicMaterial color="#ec4899" wireframe={true} transparent={true} opacity={0.3} />
      </mesh>
      <mesh position={[(texScaleX * 0.15), -(texScaleY * 0.42), 0]}>
        <cylinderGeometry args={[texScaleX * 0.06, texScaleX * 0.05, texScaleY * 0.35]} />
        <meshBasicMaterial color="#ec4899" wireframe={true} transparent={true} opacity={0.3} />
      </mesh>

      {/* Calves */}
      <mesh position={[-(texScaleX * 0.15), -(texScaleY * 0.75), 0]}>
        <cylinderGeometry args={[texScaleX * 0.05, texScaleX * 0.04, texScaleY * 0.3]} />
        <meshBasicMaterial color="#f59e0b" wireframe={true} transparent={true} opacity={0.3} />
      </mesh>
      <mesh position={[(texScaleX * 0.15), -(texScaleY * 0.75), 0]}>
        <cylinderGeometry args={[texScaleX * 0.05, texScaleX * 0.04, texScaleY * 0.3]} />
        <meshBasicMaterial color="#f59e0b" wireframe={true} transparent={true} opacity={0.3} />
      </mesh>

      {/* Avatar joints - Head/Neck */}
      <mesh position={[0, texScaleY * 0.35, 0]}>
        <sphereGeometry args={[texScaleX * 0.15, 12, 12]} />
        <meshBasicMaterial color="#fff" wireframe={true} transparent={true} opacity={0.4} />
      </mesh>

      {/* Avatar joints - Shoulders */}
      <mesh position={[-(texScaleX * 0.3), texScaleY * 0.15, 0]}>
        <sphereGeometry args={[texScaleX * 0.08, 8, 8]} />
        <meshBasicMaterial color="#ff00ff" wireframe={true} transparent={true} opacity={0.5} />
      </mesh>
      <mesh position={[(texScaleX * 0.3), texScaleY * 0.15, 0]}>
        <sphereGeometry args={[texScaleX * 0.08, 8, 8]} />
        <meshBasicMaterial color="#ff00ff" wireframe={true} transparent={true} opacity={0.5} />
      </mesh>

      {/* Avatar joints - Elbows */}
      <mesh position={[-(texScaleX * 0.4), -(texScaleY * 0.05), 0]}>
        <sphereGeometry args={[texScaleX * 0.06, 8, 8]} />
        <meshBasicMaterial color="#00ffcc" wireframe={true} transparent={true} opacity={0.6} />
      </mesh>
      <mesh position={[(texScaleX * 0.4), -(texScaleY * 0.05), 0]}>
        <sphereGeometry args={[texScaleX * 0.06, 8, 8]} />
        <meshBasicMaterial color="#00ffcc" wireframe={true} transparent={true} opacity={0.6} />
      </mesh>

      {/* Avatar joints - Wrists / Hands */}
      <mesh position={[-(texScaleX * 0.45), -(texScaleY * 0.25), 0]}>
        <boxGeometry args={[texScaleX * 0.08, texScaleX * 0.08, texScaleX * 0.08]} />
        <meshBasicMaterial color="#00aaff" wireframe={true} transparent={true} opacity={0.6} />
      </mesh>
      <mesh position={[(texScaleX * 0.45), -(texScaleY * 0.25), 0]}>
        <boxGeometry args={[texScaleX * 0.08, texScaleX * 0.08, texScaleX * 0.08]} />
        <meshBasicMaterial color="#00aaff" wireframe={true} transparent={true} opacity={0.6} />
      </mesh>

      {/* Avatar joints - Hips */}
      <mesh position={[-(texScaleX * 0.15), -(texScaleY * 0.25), 0]}>
        <sphereGeometry args={[texScaleX * 0.08, 8, 8]} />
        <meshBasicMaterial color="#ec4899" wireframe={true} transparent={true} opacity={0.5} />
      </mesh>
      <mesh position={[(texScaleX * 0.15), -(texScaleY * 0.25), 0]}>
        <sphereGeometry args={[texScaleX * 0.08, 8, 8]} />
        <meshBasicMaterial color="#ec4899" wireframe={true} transparent={true} opacity={0.5} />
      </mesh>

      {/* Avatar joints - Knees */}
      <mesh position={[-(texScaleX * 0.15), -(texScaleY * 0.6), 0]}>
        <sphereGeometry args={[texScaleX * 0.07, 8, 8]} />
        <meshBasicMaterial color="#f59e0b" wireframe={true} transparent={true} opacity={0.5} />
      </mesh>
      <mesh position={[(texScaleX * 0.15), -(texScaleY * 0.6), 0]}>
        <sphereGeometry args={[texScaleX * 0.07, 8, 8]} />
        <meshBasicMaterial color="#f59e0b" wireframe={true} transparent={true} opacity={0.5} />
      </mesh>

      {/* Avatar joints - Feet / Toes */}
      <mesh position={[-(texScaleX * 0.15), -(texScaleY * 0.9), (texScaleX * 0.05)]}>
        <boxGeometry args={[texScaleX * 0.1, texScaleX * 0.06, texScaleX * 0.15]} />
        <meshBasicMaterial color="#eab308" wireframe={true} transparent={true} opacity={0.6} />
      </mesh>
      <mesh position={[(texScaleX * 0.15), -(texScaleY * 0.9), (texScaleX * 0.05)]}>
        <boxGeometry args={[texScaleX * 0.1, texScaleX * 0.06, texScaleX * 0.15]} />
        <meshBasicMaterial color="#eab308" wireframe={true} transparent={true} opacity={0.6} />
      </mesh>

      {/* Blueprint Grid Base */}
      <gridHelper args={[Math.max(texScaleX * 1.5, scaleZ * 1.5), 10, '#00ffcc', '#004466']} position={[0, -(texScaleY * 0.45) + scaleZ * 0.1, 0]} />
      <axesHelper args={[texScaleX * 0.6]} />
    </group>
  );
}
