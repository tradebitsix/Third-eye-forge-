import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// Holographic Icon Component representing developer platforms
function HolographicSign({ 
  position, 
  title, 
  type, 
  scale = 1 
}: { 
  position: [number, number, number], 
  title: string, 
  type: 'vercel' | 'github' | 'railway' | 'render', 
  scale?: number 
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.5;
      meshRef.current.position.y = position[1] + Math.sin(t * 2 + position[0]) * 0.15;
    }
    if (glowRef.current) {
      const scaleValue = 1.0 + Math.sin(t * 4) * 0.08;
      glowRef.current.scale.set(scaleValue, scaleValue, scaleValue);
    }
  });

  // Render geometry representing high-tech platform logos
  const logoGeometry = useMemo(() => {
    if (type === 'vercel') {
      // Vercel Triangle
      const geom = new THREE.ConeGeometry(0.3 * scale, 0.45 * scale, 3);
      geom.rotateX(Math.PI / 2);
      return geom;
    } else if (type === 'railway') {
      // Railway dual-strip stylized geometry (octahedron representation)
      return new THREE.BoxGeometry(0.12 * scale, 0.4 * scale, 0.4 * scale);
    } else if (type === 'github') {
      // GitHub stylized cat ears shape or octagram
      return new THREE.OctahedronGeometry(0.24 * scale);
    } else {
      // Generic glowing diamond for other services
      return new THREE.DodecahedronGeometry(0.2 * scale);
    }
  }, [type, scale]);

  const glowColor = useMemo(() => {
    switch(type) {
      case 'vercel': return '#ffffff';
      case 'github': return '#a855f7'; // Purple
      case 'railway': return '#f43f5e'; // Rose pink
      default: return '#06b6d4'; // Cyan
    }
  }, [type]);

  return (
    <group position={[position[0], position[1], position[2]]}>
      {/* Mini floating pedestal */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.4 * scale, 0.5 * scale, 0.08 * scale, 8]} />
        <meshStandardMaterial color="#111118" roughness={0.8} />
      </mesh>
      
      {/* Pedestal glow */}
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35 * scale, 0.4 * scale, 16]} />
        <meshBasicMaterial color={glowColor} side={THREE.DoubleSide} transparent opacity={0.6} />
      </mesh>

      {/* Actual Hologram Mesh */}
      <mesh ref={meshRef} position={[0, 0, 0]} geometry={logoGeometry}>
        <meshStandardMaterial 
          color={glowColor} 
          emissive={glowColor} 
          emissiveIntensity={1.8} 
          transparent 
          opacity={0.8} 
          wireframe 
        />
      </mesh>

      {/* Hologram Core Glow */}
      <mesh ref={glowRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.12 * scale, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.4} />
      </mesh>

      {/* Billboard title */}
      <Text 
        position={[0, 0.55, 0]} 
        fontSize={0.12} 
        color="#ffffff" 
        font="monospace" 
        anchorX="center"
        maxWidth={2}
      >
        {title}
      </Text>
    </group>
  );
}

// 3D District Sky-bridge component linking structures together
function SkyBridge({ 
  start, 
  end, 
  color = '#00f7ff' 
}: { 
  start: [number, number, number], 
  end: [number, number, number], 
  color?: string 
}) {
  const pStart = new THREE.Vector3(...start);
  const pEnd = new THREE.Vector3(...end);
  const distance = pStart.distanceTo(pEnd);
  const midPoint = new THREE.Vector3().addVectors(pStart, pEnd).multiplyScalar(0.5);
  
  // Calculate orientation
  const direction = new THREE.Vector3().subVectors(pEnd, pStart).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);

  return (
    <group position={midPoint} quaternion={quaternion}>
      {/* Beautiful transparent neon transport tubes */}
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, distance, 8]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={0.6}
          transparent 
          opacity={0.25} 
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>
      
      {/* Core laser beam */}
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, distance, 4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>

      {/* Glowing support rings spaced along the bridge */}
      {Array.from({ length: Math.ceil(distance / 2) }).map((_, idx) => {
        const offset = (idx - (Math.ceil(distance / 2) - 1) / 2) * 2;
        return (
          <mesh key={idx} position={[0, offset, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.13, 0.015, 8, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function CitySkyline() {
  // Generate random cyberpunk towers and buildings layout once
  const buildings = useMemo(() => {
    const list = [];
    const seedRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Construct districts in a 360 ring
    const districtsCount = 8;
    const itemsPerDistrict = 3;

    for (let d = 0; d < districtsCount; d++) {
      const angle = (d / districtsCount) * Math.PI * 2;
      const baseRadius = 24 + seedRandom(d) * 8; // keeps far enough but highly visible

      for (let i = 0; i < itemsPerDistrict; i++) {
        const itemSeed = d * 10 + i;
        const subAngle = angle + (seedRandom(itemSeed) - 0.5) * 0.4;
        const r = baseRadius + (seedRandom(itemSeed + 1) - 0.5) * 4;
        
        const x = Math.sin(subAngle) * r;
        const z = Math.cos(subAngle) * r;
        
        const width = 1.5 + seedRandom(itemSeed + 2) * 2;
        const depth = 1.5 + seedRandom(itemSeed + 3) * 2;
        const height = 8 + seedRandom(itemSeed + 4) * 18;
        const y = height / 2 - 4; // root base slightly offset below horizontal

        // Decide building aesthetic coloring palette
        let neonColor = '#00ffcc'; // Standard cyan-green Fanz color
        if (d % 3 === 0) neonColor = '#3b82f6'; // Deep Blue
        else if (d % 3 === 1) neonColor = '#eab308'; // Sacred Gold
        else neonColor = '#a855f7'; // Purple

        list.push({
          id: `${d}-${i}`,
          x, y, z,
          width, height, depth,
          neonColor,
          glowIntensity: 0.15 + seedRandom(itemSeed + 5) * 0.5,
          hasHolo: seedRandom(itemSeed + 6) > 0.7,
        });
      }
    }
    return list;
  }, []);

  // Generate laser highways and flowing energy paths
  const energyLanes = useMemo(() => {
    return [
      { start: [-12, -2, -12] as [number, number, number], end: [-18, 2, -4] as [number, number, number], color: '#eab308' },
      { start: [12, -2, -12] as [number, number, number], end: [18, 3, -18] as [number, number, number], color: '#3b82f6' },
      { start: [15, -1, 10] as [number, number, number], end: [8, 1, 22] as [number, number, number], color: '#00ffcc' },
      { start: [-15, 0, 15] as [number, number, number], end: [-6, 3, 24] as [number, number, number], color: '#a855f7' },
      // Ring sky-bridges linking tallest district towers
      { start: [-22, 6, -10] as [number, number, number], end: [-15, 8, -20] as [number, number, number], color: '#eab308' },
      { start: [16, 5, -14] as [number, number, number], end: [24, 7, 2] as [number, number, number], color: '#3b82f6' },
      { start: [-5, 4, 25] as [number, number, number], end: [12, 6, 20] as [number, number, number], color: '#00ffcc' },
    ];
  }, []);

  return (
    <group>
      {/* Cyberpunk City Skyline Buildings */}
      {buildings.map((b) => (
        <group key={b.id} position={[b.x, b.y, b.z]}>
          {/* Main Oblique Glass Monolith skyscraper */}
          <mesh>
            <boxGeometry args={[b.width, b.height, b.depth]} />
            <meshStandardMaterial 
              color="#07070d" 
              roughness={0.15} 
              metalness={0.92} 
              transparent 
              opacity={0.88} 
            />
          </mesh>

          {/* Glowing wireframe outer corners indicating cyber architecture */}
          <mesh>
            <boxGeometry args={[b.width + 0.02, b.height + 0.02, b.depth + 0.02]} />
            <meshBasicMaterial 
              color={b.neonColor} 
              wireframe 
              transparent 
              opacity={0.35} 
            />
          </mesh>

          {/* Golden luminous structural highlights or accent stripes */}
          <mesh position={[0, 0, b.depth / 2 + 0.01]}>
            <planeGeometry args={[0.08, b.height * 0.8]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.6} />
          </mesh>
          <mesh position={[b.width / 2 + 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.08, b.height * 0.8]} />
            <meshBasicMaterial color={b.neonColor} transparent opacity={0.6} />
          </mesh>

          {/* Top spires warning strobe lights */}
          <mesh position={[0, b.height / 2 + 0.3, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 4]} />
            <meshBasicMaterial color={b.neonColor} />
          </mesh>
          <mesh position={[0, b.height / 2 + 0.6, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* Subtle grid window pattern (small glowing dots/cubes) */}
          <group position={[0, 0, b.depth / 2 + 0.005]}>
            {Array.from({ length: 4 }).map((_, row) => {
              const rowY = (row - 1.5) * (b.height / 6);
              return (
                <group key={row} position={[0, rowY, 0]}>
                  {Array.from({ length: 3 }).map((_, col) => {
                    const colX = (col - 1) * (b.width / 4);
                    const randVal = Math.sin(col * 3.7 + row * 12.5 + parseFloat(b.id));
                    const isWindowActive = randVal > -0.2;
                    return isWindowActive ? (
                      <mesh key={col} position={[colX, 0, 0]}>
                        <planeGeometry args={[0.18, 0.22]} />
                        <meshBasicMaterial 
                          color={col % 2 === 0 ? '#ffffff' : b.neonColor} 
                          transparent 
                          opacity={0.7} 
                        />
                      </mesh>
                    ) : null;
                  })}
                </group>
              );
            })}
          </group>
        </group>
      ))}

      {/* Elegant sky-bridges linking the district skyscrapers */}
      {energyLanes.map((lane, index) => (
        <SkyBridge 
          key={index} 
          start={lane.start} 
          end={lane.end} 
          color={lane.color} 
        />
      ))}

      {/* High-visibility Holographic Signs branding developer spaces */}
      <HolographicSign 
        position={[-18, 9, -24]} 
        title="VERCEL PIPELINE" 
        type="vercel" 
        scale={1.3} 
      />
      <HolographicSign 
        position={[22, 11, -12]} 
        title="GITHUB REPOS" 
        type="github" 
        scale={1.2} 
      />
      <HolographicSign 
        position={[14, 10, 22]} 
        title="RAILWAY PLATFORM" 
        type="railway" 
        scale={1.4} 
      />
      <HolographicSign 
        position={[-20, 8, 14]} 
        title="RENDER ENGINE" 
        type="render" 
        scale={1.1} 
      />
    </group>
  );
}
