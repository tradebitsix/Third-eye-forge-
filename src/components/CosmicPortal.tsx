import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface CosmicPortalProps {
  position: [number, number, number];
  scale?: number;
  label: string;
  targetRoom: string;
  onEnter: (room: string) => void;
  imageTextureUrl?: string; // Kept for interface compatibility
  themeColor?: string;
}

export default function CosmicPortal({ position, scale = 1, label, targetRoom, onEnter, themeColor = '#00ffcc' }: CosmicPortalProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const spiralGroupRef = useRef<THREE.Group>(null!);
  const orbitGroupRef = useRef<THREE.Group>(null!);

  const [hovered, setHovered] = useState(false);
  const hoverProgressRef = useRef(0);

  // Gaze timing refs for triggering of orbital "glowing dust"
  const gazeStartTimeRef = useRef(0);
  const gazeProgressRef = useRef(0);
  const pointsRef = useRef<THREE.Points>(null!);

  const PARTICLE_COUNT = 85;

  // Particle distribution inside a disk/ring covering the portal vortex boundary
  const { positions, relativeAttributes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const specs = Array.from({ length: PARTICLE_COUNT }, () => {
      // Ring radius matching the inner spiral bounds
      const radius = (0.2 + Math.random() * 0.95) * scale;
      const speed = (0.7 + Math.random() * 1.5) * (Math.random() > 0.5 ? 1 : -1);
      const phase = Math.random() * Math.PI * 2;
      const initialAngle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * 0.16 * scale;
      return { radius, speed, phase, initialAngle, elevation };
    });

    specs.forEach((spec, i) => {
      const angle = spec.initialAngle;
      pos[i * 3] = Math.cos(angle) * spec.radius;
      pos[i * 3 + 1] = Math.sin(angle) * spec.radius - 0.1 * scale;
      pos[i * 3 + 2] = 0.08 * scale + spec.elevation;
    });

    return { positions: pos, relativeAttributes: specs };
  }, [scale]);

  // Generate 32 rectangular blocks in a spiral layout for the decorative lithophane center
  const spiralBoxes = useMemo(() => {
    const items = [];
    const count = 32;
    for (let i = 0; i < count; i++) {
      const percentage = i / count;
      const angle = percentage * Math.PI * 5; // 2.5 revolutions
      const radius = (0.2 + percentage * 0.75) * scale;
      const x = Math.sin(angle) * radius;
      const y = Math.cos(angle) * radius - 0.1 * scale;
      const z = percentage * 0.08 * scale;
      const boxSize = (0.05 + percentage * 0.08) * scale;
      items.push({ x, y, z, size: boxSize, angle });
    }
    return items;
  }, [scale]);

  // Orbit parameters for the five larger metallic orbiting cubes from the Grok image
  const orbitCubes = useMemo(() => {
    return [
      { basePos: [-1.2 * scale, 0.8 * scale, 0.2 * scale], size: 0.3 * scale, phase: 0 },
      { basePos: [1.2 * scale, 0.7 * scale, 0.1 * scale], size: 0.32 * scale, phase: 1.2 },
      { basePos: [1.4 * scale, -0.6 * scale, 0.3 * scale], size: 0.35 * scale, phase: 2.5 },
      { basePos: [-1.1 * scale, -1.0 * scale, 0.15 * scale], size: 0.28 * scale, phase: 3.8 },
      { basePos: [-1.5 * scale, -0.1 * scale, 0.25 * scale], size: 0.31 * scale, phase: 5.0 },
    ];
  }, [scale]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Smoothly interpolate hover progress
    const targetProgress = hovered ? 1 : 0;
    hoverProgressRef.current = THREE.MathUtils.lerp(hoverProgressRef.current, targetProgress, 0.15);

    // Gaze tracking logic: user hovers/gazes for > 500ms
    if (hovered) {
      if (gazeStartTimeRef.current === 0) {
        gazeStartTimeRef.current = t;
      }
      const gazeDuration = t - gazeStartTimeRef.current;
      const isGazing = gazeDuration > 0.5; // >500ms
      const targetGazeProgress = isGazing ? 1 : 0;
      gazeProgressRef.current = THREE.MathUtils.lerp(gazeProgressRef.current, targetGazeProgress, 0.08);
    } else {
      gazeStartTimeRef.current = 0;
      gazeProgressRef.current = THREE.MathUtils.lerp(gazeProgressRef.current, 0, 0.12);
    }

    // Smooth mystical float of the entire plaque
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.05;
      groupRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.08 * scale;
    }

    // Spin the main central spiral vortex - scales up and rotates faster on hover!
    if (spiralGroupRef.current) {
      spiralGroupRef.current.rotation.z = -t * (0.4 + hoverProgressRef.current * 0.5);
      spiralGroupRef.current.scale.setScalar(1.0 + hoverProgressRef.current * 0.1);
    }

    // Animate larger orbiting cubes with individual wave cycles to mimic floating in depth
    if (orbitGroupRef.current) {
      const children = orbitGroupRef.current.children;
      orbitCubes.forEach((cube, i) => {
        if (children[i]) {
          const mesh = children[i] as THREE.Mesh;
          const wobble = Math.sin(t * 1.5 + cube.phase) * 0.06 * scale;
          mesh.position.set(
            cube.basePos[0] + wobble * 0.5,
            cube.basePos[1] + wobble,
            cube.basePos[2] + Math.cos(t + cube.phase) * 0.05 * scale
          );
          mesh.rotation.x = t * (0.2 + hoverProgressRef.current * 0.3) + cube.phase;
          mesh.rotation.y = t * (0.3 + hoverProgressRef.current * 0.3) + cube.phase;
        }
      });
    }

    // Animate the orbital dynamic glowing dust particle ring system!
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const positionsArray = posAttr.array as Float32Array;
      const pGlow = gazeProgressRef.current;

      relativeAttributes.forEach((spec, i) => {
        // Dust particles orbit faster depending on gaze intensity (up to 4.5x faster)
        const multiplier = 0.6 + pGlow * 3.8;
        const currentAngle = spec.initialAngle + t * spec.speed * multiplier;
        // Radii dynamically pulsates & expands outward slightly upon full gaze locks
        const currentRadius = spec.radius * (1.0 + Math.sin(t * 2.8 + spec.phase) * 0.06 * pGlow);

        positionsArray[i * 3] = Math.cos(currentAngle) * currentRadius;
        positionsArray[i * 3 + 1] = Math.sin(currentAngle) * currentRadius - 0.1 * scale;
        positionsArray[i * 3 + 2] = 0.08 * scale + spec.elevation + Math.sin(t * 2.4 + spec.phase) * 0.05 * scale * pGlow;
      });
      posAttr.needsUpdate = true;

      // Smoothly fade in/out particle visibility & scale
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      if (mat) {
        mat.opacity = pGlow * 0.95;
        mat.size = 0.15 * scale * (0.85 + pGlow * 0.45);
      }
    }
  });

  const handleEnter = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto'; // Reset cursor
    onEnter(targetRoom);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    setHovered(true);
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    setHovered(false);
  };

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      {/* 0. Dedicated Invisible Click Catching Slate */}
      <mesh 
        position={[0, 0, 0.1]} 
        onClick={handleEnter}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[3.2 * scale, 4.8 * scale]} />
        <meshBasicMaterial visible={false} color={themeColor} />
      </mesh>

      {/* 1. Backdrop Glow Layer */}
      <mesh position={[0, 0, -0.2]}>
        <planeGeometry args={[3.2 * scale, 4.8 * scale]} />
        <meshBasicMaterial color={themeColor} transparent opacity={0.08} />
      </mesh>

      {/* 2. Primary Sci-Fi PCB / Lithophane Plaque Body (100x150x4 aspect) */}
      <group>
        {/* Outer glowing border frame */}
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[2.55 * scale, 3.85 * scale]} />
          <meshBasicMaterial color={themeColor} transparent opacity={0.4} />
        </mesh>

        {/* Intricate thin cyber lines grid layout */}
        <mesh position={[0, 0, -0.045]}>
          <planeGeometry args={[2.5 * scale, 3.8 * scale]} />
          <meshBasicMaterial color="#020306" />
        </mesh>

        {/* Main translucent glass slate plate */}
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[2.45 * scale, 3.75 * scale]} />
          <meshStandardMaterial 
            color="#080911" 
            roughness={0.15} 
            metalness={0.92} 
            transparent 
            opacity={0.94} 
          />
        </mesh>
      </group>

      {/* 3. Outer cybernetic neon corner bracket guidelines */}
      <group position={[0, 0, -0.02]}>
        {/* Top-left bracket */}
        <group position={[-1.15 * scale, 1.8 * scale, 0]}>
          <mesh position={[0.1 * scale, 0, 0]}>
            <planeGeometry args={[0.2 * scale, 0.02 * scale]} />
            <meshBasicMaterial color={themeColor} />
          </mesh>
          <mesh position={[0, -0.1 * scale, 0]}>
            <planeGeometry args={[0.02 * scale, 0.2 * scale]} />
            <meshBasicMaterial color={themeColor} />
          </mesh>
        </group>
        {/* Top-right bracket */}
        <group position={[1.15 * scale, 1.8 * scale, 0]}>
          <mesh position={[-0.1 * scale, 0, 0]}>
            <planeGeometry args={[0.2 * scale, 0.02 * scale]} />
            <meshBasicMaterial color={themeColor} />
          </mesh>
          <mesh position={[0, -0.1 * scale, 0]}>
            <planeGeometry args={[0.02 * scale, 0.2 * scale]} />
            <meshBasicMaterial color={themeColor} />
          </mesh>
        </group>
        {/* Bottom-left bracket */}
        <group position={[-1.15 * scale, -1.8 * scale, 0]}>
          <mesh position={[0.1 * scale, 0, 0]}>
            <planeGeometry args={[0.2 * scale, 0.02 * scale]} />
            <meshBasicMaterial color={themeColor} />
          </mesh>
          <mesh position={[0, 0.1 * scale, 0]}>
            <planeGeometry args={[0.02 * scale, 0.2 * scale]} />
            <meshBasicMaterial color={themeColor} />
          </mesh>
        </group>
        {/* Bottom-right bracket */}
        <group position={[1.15 * scale, -1.8 * scale, 0]}>
          <mesh position={[-0.1 * scale, 0, 0]}>
            <planeGeometry args={[0.2 * scale, 0.02 * scale]} />
            <meshBasicMaterial color={themeColor} />
          </mesh>
          <mesh position={[0, 0.1 * scale, 0]}>
            <planeGeometry args={[0.02 * scale, 0.2 * scale]} />
            <meshBasicMaterial color={themeColor} />
          </mesh>
        </group>
      </group>

      {/* 4. Top HUD Display Elements */}
      <Text 
        position={[-1.0 * scale, 1.6 * scale, 0.02]} 
        fontSize={0.075 * scale} 
        color="#c084fc" 
        anchorX="left" 
        maxWidth={1.0 * scale}
      >
        DESTINATION
      </Text>
      <Text 
        position={[1.0 * scale, 1.6 * scale, 0.02]} 
        fontSize={0.065 * scale} 
        color={themeColor} 
        anchorX="right"
      >
        ACTIVE: 100%
      </Text>

      {/* A tiny HUD graph representation */}
      <group position={[-1.0 * scale, 1.4 * scale, 0.02]}>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i} position={[i * 0.06 * scale, 0, 0]}>
            <planeGeometry args={[0.03 * scale, (0.05 + Math.sin(i * 0.8) * 0.08 + 0.1) * scale]} />
            <meshBasicMaterial color={themeColor} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>

      {/* 5. "The" Branding Text styled exactly like Grok design */}
      <Text 
        position={[0, 1.1 * scale, 0.05]} 
        fontSize={0.48 * scale} 
        color="#ffffff" 
        anchorX="center" 
        anchorY="middle"
        outlineWidth={0.025 * scale}
        outlineColor="#0f111a"
        outlineOpacity={0.9}
      >
        The
      </Text>

      {/* Invisible DOM node with requested CSS selector ID */}
      <Html pointerEvents="none" style={{ display: 'none' }}>
        <div id="nexus-hub-3d-portal" className="hidden opacity-0 pointer-events-none" />
      </Html>

      {/* Orbiting Dynamic Glowing Dust Particles */}
      <points ref={pointsRef} position={[0, 0, 0.03]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial 
          color={themeColor} 
          size={0.15 * scale} 
          transparent 
          opacity={0.0} 
          sizeAttenuation 
          depthWrite={false} 
          toneMapped={false} 
        />
      </points>

      {/* 6. Centered Whirlpool / Vortex Swirl */}
      <group ref={spiralGroupRef} position={[0, -0.1 * scale, 0.03]}>
        {/* Delicate glowing circular backing */}
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[0.1 * scale, 1.05 * scale, 64]} />
          <meshBasicMaterial color="#090514" transparent opacity={0.5} />
        </mesh>
        
        {spiralBoxes.map((box, i) => (
          <mesh key={i} position={[box.x, box.y, box.z]} rotation={[0, 0, box.angle + Math.PI / 4]}>
            <boxGeometry args={[box.size, box.size * 1.5, box.size * 0.3]} />
            <meshStandardMaterial 
              color={themeColor} 
              emissive={themeColor} 
              emissiveIntensity={0.8}
              roughness={0.1}
              metalness={0.9}
            />
          </mesh>
        ))}
      </group>

      {/* 7. Large floating silver-blue orbit blocks flanking the vortex */}
      <group ref={orbitGroupRef}>
        {orbitCubes.map((cube, i) => (
          <mesh key={i} position={cube.basePos as [number, number, number]}>
            <boxGeometry args={[cube.size, cube.size, cube.size]} />
            <meshStandardMaterial 
              color="#ffffff" 
              emissive={themeColor}
              emissiveIntensity={0.25}
              roughness={0.04} 
              metalness={0.98} 
            />
          </mesh>
        ))}
      </group>

      {/* 8. "One" Branding Text styled exactly like Grok design */}
      <Text 
        position={[0, -1.2 * scale, 0.05]} 
        fontSize={0.48 * scale} 
        color="#ffffff" 
        anchorX="center" 
        anchorY="middle"
        outlineWidth={0.025 * scale}
        outlineColor="#0f111a"
        outlineOpacity={0.9}
      >
        One
      </Text>

      {/* 9. Bottom Details & Sign-off signature */}
      <Text 
        position={[-1.0 * scale, -1.6 * scale, 0.02]} 
        fontSize={0.06 * scale} 
        color="#818cf8" 
        anchorX="left"
      >
        PLA - LITHOPHANE
      </Text>
      <Text 
        position={[1.0 * scale, -1.6 * scale, 0.02]} 
        fontSize={0.07 * scale} 
        color="#ffffff" 
        anchorX="right"
      >
        By FanzOfTheOne
      </Text>

      {/* 10. MAIN ENTRANCE TITLE: Displayed proudly below the entrance door */}
      <group position={[0, -2.4 * scale, 0]}>
        {/* Subtle decorative target cursor bracket */}
        <mesh position={[0, 0.35 * scale, 0]}>
          <planeGeometry args={[1.8 * scale, 0.015 * scale]} />
          <meshBasicMaterial color={themeColor} transparent opacity={0.3} />
        </mesh>
        
        {/* Background glow capsule board for high-contrast legibility */}
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[2.0 * scale, 0.45 * scale]} />
          <meshBasicMaterial color="#05050a" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0, -0.06]}>
          <planeGeometry args={[2.05 * scale, 0.5 * scale]} />
          <meshBasicMaterial color={themeColor} transparent opacity={0.4} />
        </mesh>

        {/* Portal Entrance Label */}
        <Text 
          position={[0, 0, 0.02]} 
          fontSize={0.21 * scale} 
          color={themeColor} 
          anchorX="center" 
          anchorY="middle"
        >
          {`[ ${label} ]`}
        </Text>
      </group>
    </group>
  );
}
