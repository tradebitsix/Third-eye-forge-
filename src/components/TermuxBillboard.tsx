import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const POOLS_OF_LOGS = [
  'system INIT sequence completed successfully.',
  'syncing firestore database blueprints...',
  'mCP service core client CONNECTED [Port: 2043]',
  'FanzAgent Guardian-3 deployed to segment A1.',
  'optimizing 3D Print STL mesh resolution...',
  'compiling Vite SPA web assets to /dist...',
  'gaze tracker calibration sequence OK.',
  'git push origin main -m "Refactoring memory forge"',
  'Gemini-3.5-pro LLM response latency: 284ms',
  'active users tracked in district portal: 139',
  'compiling shader buffer objects... done.',
  'building webgl fallback pipeline state grid.',
  'memory trauma refinery core TEMPERATURE STABLE.',
  'deploying Railway deployment cluster - sync: OK.',
  'synaptic skeletal finger coordinates calculated.',
  'Refining raw subconscious prompt data layers...',
  'The One virtual layout universe active - status: 100%'
];

interface TermuxBillboardProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  terminalName: string;
  themeColor?: string;
}

export function TermuxBillboard({ 
  position, 
  rotation = [0, 0, 0], 
  scale = 1,
  terminalName,
  themeColor = '#00ffcc'
}: TermuxBillboardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const blinkRef = useRef(true);
  const timerRef = useRef(0);
  const logTimerRef = useRef(0);

  const [activeLogs, setActiveLogs] = useState<string[]>([
    'Initializing prompt stream...',
    'Resolving agent parameters...',
    'Ready for instruction queries...'
  ]);

  // Periodic scrolling terminal agent logs simulation
  useFrame((state, delta) => {
    // Blink console cursor pointer
    timerRef.current += delta;
    if (timerRef.current > 0.4) {
      timerRef.current = 0;
      blinkRef.current = !blinkRef.current;
    }

    // Scroll logs slowly
    logTimerRef.current += delta;
    if (logTimerRef.current > 3.0) {
      logTimerRef.current = 0;
      
      const newLog = POOLS_OF_LOGS[Math.floor(Math.random() * POOLS_OF_LOGS.length)];
      setActiveLogs((prev) => {
        const next = [...prev.slice(1), newLog];
        return next;
      });
    }

    // Floating animation
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 0.7 + position[0]) * 0.12 * scale;
    }
  });

  // Construct text string representation for terminal
  const logBlockText = activeLogs.map((log, idx) => `> ${log}`).join('\n');
  const cursorChar = blinkRef.current ? '_' : ' ';

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* 1. Terminal Backplate glass */}
      <mesh>
        <planeGeometry args={[5 * scale, 3.2 * scale]} />
        <meshStandardMaterial 
          color="#030408" 
          roughness={0.2} 
          metalness={0.88} 
          transparent 
          opacity={0.85} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Cyber neon bordering panel line */}
      <mesh position={[0, 0, -0.015]}>
        <planeGeometry args={[5.05 * scale, 3.25 * scale]} />
        <meshBasicMaterial 
          color={themeColor} 
          transparent 
          opacity={0.4} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner glowing edge framing panel */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[4.9 * scale, 3.1 * scale]} />
        <meshBasicMaterial 
          color={themeColor} 
          wireframe 
          transparent 
          opacity={0.2} 
        />
      </mesh>

      {/* 3. Top Terminal Bar Indicator */}
      <group position={[0, 1.35 * scale, 0.01]}>
        {/* Border line */}
        <mesh position={[0, -0.1 * scale, 0]}>
          <planeGeometry args={[4.6 * scale, 0.015 * scale]} />
          <meshBasicMaterial color={themeColor} transparent opacity={0.5} />
        </mesh>
        
        {/* Terminal Header Text */}
        <Text
          position={[-2.3 * scale, 0, 0]}
          fontSize={0.16 * scale}
          color={themeColor}
          font="monospace"
          anchorX="left"
        >
          {`[TERMUX: ${terminalName.toUpperCase()}]`}
        </Text>

        {/* Server ping rate badge */}
        <Text
          position={[2.3 * scale, 0, 0]}
          fontSize={0.13 * scale}
          color="#ffffff"
          font="monospace"
          anchorX="right"
        >
          ONLINE // 60FPS
        </Text>
      </group>

      {/* 4. Console Logs Body Display */}
      <Text
        position={[-2.3 * scale, 0.8 * scale, 0.015]}
        fontSize={0.145 * scale}
        color="#ffffff"
        font="monospace"
        anchorX="left"
        anchorY="top"
        maxWidth={4.6 * scale}
        lineHeight={1.4}
      >
        {logBlockText}
      </Text>

      {/* 5. Active prompt terminal pointer */}
      <Text
        position={[-2.3 * scale, -1.0 * scale, 0.015]}
        fontSize={0.15 * scale}
        color={themeColor}
        font="monospace"
        anchorX="left"
        anchorY="bottom"
      >
        {`fanz-workspace@agent-city:~$ active-loop${cursorChar}`}
      </Text>

      {/* Bottom corner HUD details */}
      <group position={[0, -1.4 * scale, 0.01]}>
        <Text
          position={[2.3 * scale, 0, 0]}
          fontSize={0.11 * scale}
          color="#52525b"
          font="monospace"
          anchorX="right"
        >
          SECURE ENCRYPTED INTERFACE v12.1a
        </Text>
      </group>
    </group>
  );
}

// Group manager adding multiple screens naturally into sections of the city
export default function LogScreens() {
  return (
    <group>
      {/* Tall central towering logs near Hub center */}
      <TermuxBillboard 
        position={[-8, 5, -12]} 
        rotation={[0, 0.45, 0]} 
        scale={0.9} 
        terminalName="Central-Sync-Core" 
        themeColor="#eab308" // Gold
      />

      <TermuxBillboard 
        position={[8, 4.5, -15]} 
        rotation={[0, -0.4, 0]} 
        scale={0.94} 
        terminalName="Memory-Refinery" 
        themeColor="#00ffcc" // Cyan
      />

      {/* Hovering street level billboard */}
      <TermuxBillboard 
        position={[-11, 2, 8]} 
        rotation={[0, 1.1, 0]} 
        scale={0.7} 
        terminalName="Guardian-Telemetry" 
        themeColor="#3b82f6" // Custom soft-blue
      />

      {/* Far elements for cosmic atmosphere */}
      <TermuxBillboard 
        position={[14, 6, 12]} 
        rotation={[0, -1.2, 0]} 
        scale={0.8} 
        terminalName="Market-Processor" 
        themeColor="#a855f7" // Purple
      />
    </group>
  );
}
