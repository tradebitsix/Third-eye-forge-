import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GuardianProps {
  basePosition: [number, number, number];
  color?: string;
  speed?: number;
  hoverRadius?: number;
}

export function FanzAgentGuardian({ 
  basePosition, 
  color = '#38bdf8', // Light sky blue
  speed = 1.0, 
  hoverRadius = 3.0 
}: GuardianProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const eyeRef = useRef<THREE.Mesh>(null);
  const wingLeftRef = useRef<THREE.Mesh>(null);
  const wingRightRef = useRef<THREE.Mesh>(null);
  const exhaustRef = useRef<THREE.Mesh>(null);

  // Generate randomized phase delays for organic life-like motions
  const randomOffsets = useMemo(() => {
    return {
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      phaseZ: Math.random() * Math.PI * 2,
      spinSpeed: 0.5 + Math.random() * 1.5,
    };
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed;
    
    if (groupRef.current) {
      // Floating orbit trajectory around its base position
      const dx = Math.sin(t + randomOffsets.phaseX) * hoverRadius;
      const dz = Math.cos(t * 0.8 + randomOffsets.phaseZ) * hoverRadius;
      const dy = Math.sin(t * 1.5 + randomOffsets.phaseY) * 0.8;

      groupRef.current.position.set(
        basePosition[0] + dx,
        basePosition[1] + dy,
        basePosition[2] + dz
      );

      // Tilt slightly in direction of motion to look organic
      groupRef.current.rotation.z = Math.sin(t) * 0.15;
      groupRef.current.rotation.x = Math.cos(t) * 0.1;
      groupRef.current.rotation.y = t * 0.3; // Gentle rotation
    }

    // Animate head bobbing and eye scale for expressions
    if (headRef.current) {
      headRef.current.position.y = Math.sin(t * 3.0) * 0.05;
    }

    if (eyeRef.current) {
      const eyePulse = 1.0 + Math.sin(t * 6.0) * 0.12;
      eyeRef.current.scale.set(eyePulse, eyePulse, eyePulse);
    }

    // Animate moving shoulder joint caps (wings) behaving like active hovering rotors
    if (wingLeftRef.current) {
      wingLeftRef.current.rotation.y = t * 6 * randomOffsets.spinSpeed;
    }
    if (wingRightRef.current) {
      wingRightRef.current.rotation.y = -t * 6 * randomOffsets.spinSpeed;
    }

    // Dynamic flame flicker on hover thruster
    if (exhaustRef.current) {
      const exhaustPulse = 0.8 + Math.random() * 0.4;
      exhaustRef.current.scale.set(exhaustPulse, exhaustPulse * 1.5, exhaustPulse);
    }
  });

  return (
    <group ref={groupRef} position={basePosition}>
      {/* Main droid capsule chassis */}
      <mesh>
        <cylinderGeometry args={[0.22, 0.22, 0.4, 12]} />
        <meshStandardMaterial 
          color="#0b132b" 
          roughness={0.2} 
          metalness={0.9} 
        />
      </mesh>

      {/* Floating dome head with rotation linkage */}
      <mesh ref={headRef} position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.22, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          color="#1c2541" 
          roughness={0.15} 
          metalness={0.95} 
        />
      </mesh>

      {/* Glowing horizontal visor eye bar */}
      <mesh ref={eyeRef} position={[0, 0.28, 0.16]}>
        <boxGeometry args={[0.24, 0.05, 0.06]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Internal Core power cells - glows softly */}
      <mesh position={[0, -0.05, 0.16]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* Decorative metal support frame wrap */}
      <mesh>
        <torusGeometry args={[0.24, 0.02, 8, 16]} />
        <meshStandardMaterial color="#48cae4" roughness={0.4} />
      </mesh>

      {/* Left wing propeller rotor */}
      <group position={[-0.32, 0.05, 0]}>
        <mesh ref={wingLeftRef}>
          <boxGeometry args={[0.2, 0.02, 0.05]} />
          <meshStandardMaterial color="#3a0ca3" roughness={0.5} />
        </mesh>
        {/* Joint indicator */}
        <mesh>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>

      {/* Right wing propeller rotor */}
      <group position={[0.32, 0.05, 0]}>
        <mesh ref={wingRightRef}>
          <boxGeometry args={[0.2, 0.02, 0.05]} />
          <meshStandardMaterial color="#3a0ca3" roughness={0.5} />
        </mesh>
        {/* Joint indicator */}
        <mesh>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>

      {/* Core hover thruster exhaust jet cone */}
      <group position={[0, -0.28, 0]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.05, 0.12, 8]} />
          <meshStandardMaterial color="#222" metalness={0.8} />
        </mesh>
        {/* Flickering flame propulsion effect */}
        <mesh ref={exhaustRef} position={[0, -0.16, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.08, 0.28, 8]} />
          <meshBasicMaterial color="#00ffcc" transparent opacity={0.85} />
        </mesh>
      </group>
    </group>
  );
}

// Collector group of multiple floating FanzAgents across districts
export default function GuardianSwarm() {
  const swarmData = useMemo(() => {
    return [
      { base: [0, 4, 0] as [number, number, number], color: '#38bdf8', speed: 0.9, radius: 4.5 },
      { base: [-8, 2, -10] as [number, number, number], color: '#00ffcc', speed: 1.2, radius: 3.5 },
      { base: [10, 3, -8] as [number, number, number], color: '#ffea00', speed: 1.0, radius: 4.8 },
      { base: [7, 1.5, 9] as [number, number, number], color: '#c084fc', speed: 0.8, radius: 3.0 },
      { base: [-9, 3, 6] as [number, number, number], color: '#38bdf8', speed: 1.1, radius: 5.0 },
      { base: [0, 6, 12] as [number, number, number], color: '#ff4d4d', speed: 1.3, radius: 6.0 }, // Inspecting high above
    ];
  }, []);

  return (
    <group>
      {swarmData.map((data, idx) => (
        <FanzAgentGuardian 
          key={idx} 
          basePosition={data.base} 
          color={data.color} 
          speed={data.speed} 
          hoverRadius={data.radius} 
        />
      ))}
    </group>
  );
}
