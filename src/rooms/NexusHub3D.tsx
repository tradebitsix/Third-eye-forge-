import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import CosmicPortal from '../components/CosmicPortal';

interface NexusHub3DProps {
  onNavigate: (room: string) => void;
}

export default function NexusHub3D({ onNavigate }: NexusHub3DProps) {
  return (
    <div className="w-full h-full absolute inset-0 z-20 bg-[#050505]">
      <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
        <color attach="background" args={['#020005']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        
        <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        <group position={[0, -1, 0]}>
          {/* Third Eye Forge Portal */}
          <CosmicPortal 
            position={[-4, 2, -2]} 
            label="THIRD EYE FORGE" 
            targetRoom="forge" 
            onEnter={onNavigate} 
            scale={0.8}
          />

          {/* Ecosystem Galaxy Portal */}
          <CosmicPortal 
            position={[4, 2, -2]} 
            label="THE VISION BOARD" 
            targetRoom="ecosystem" 
            onEnter={onNavigate} 
            scale={0.8}
          />

          {/* Jobsite VR Portal */}
          <CosmicPortal 
            position={[-2.5, 2, 3]} 
            label="JOBSITE VR" 
            targetRoom="construction_sim" 
            onEnter={onNavigate}
            scale={0.8} 
          />

          {/* Print Lab Portal */}
          <CosmicPortal 
            position={[2.5, 2, 3]} 
            label="3D PRINT LAB" 
            targetRoom="print_lab" 
            onEnter={onNavigate} 
            scale={0.8}
          />

          {/* Center piece / Life Forge tree placeholder */}
          <mesh position={[0, 1, 0]}>
            <octahedronGeometry args={[0.5]} />
            <meshStandardMaterial emissive="#00ffcc" color="#00ffcc" wireframe />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
             <cylinderGeometry args={[1.5, 1.5, 0.1, 16]} />
             <meshStandardMaterial color="#222" />
          </mesh>

          {/* Subtle grid floor */}
          <gridHelper args={[40, 40, '#333333', '#111111']} position={[0, -0.49, 0]} />
        </group>

        <OrbitControls enableDamping dampingFactor={0.02} rotateSpeed={1.0} zoomSpeed={1.2} maxDistance={15} minDistance={2} maxPolarAngle={Math.PI/2 - 0.05} />
      </Canvas>
      
      {/* 2D Overlay layer for context over the 3D Nexus */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none z-30 text-center select-none">
         <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-[0.15em] uppercase font-sans drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] leading-tight">
           SIMULATION
         </h1>
         <h1 className="text-4xl md:text-5xl font-extrabold text-[#118bf2] tracking-[0.18em] uppercase font-sans drop-shadow-[0_0_15px_rgba(17,139,242,0.7)] leading-normal mt-1">
           NEXUS
         </h1>
         <p className="mt-6 text-[#00ffcc] font-mono text-[10px] md:text-xs tracking-[0.25em] uppercase drop-shadow-[0_0_5px_rgba(0,255,204,0.3)]">
            SELECT A PORTAL TO ENTER
         </p>
      </div>
    </div>
  );
}
