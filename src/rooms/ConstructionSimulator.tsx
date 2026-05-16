import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Text, useCursor, Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { XR, createXRStore } from '@react-three/xr';

const store = createXRStore();

function RoofModel({ onPipeCorrected, pipeCorrected }: { onPipeCorrected: () => void, pipeCorrected: boolean }) {
  const pipeRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const handlePipeClick = (e: any) => {
    e.stopPropagation();
    if (!pipeCorrected) {
      onPipeCorrected();
    }
  };

  useFrame(() => {
    if (pipeRef.current && pipeCorrected) {
      pipeRef.current.position.x = THREE.MathUtils.lerp(pipeRef.current.position.x, 2, 0.05);
    }
  });

  return (
    <group position={[0, 2, 0]}>
      {/* House Base */}
      <Box args={[10, 4, 8]} position={[0, -2, 0]}>
        <meshStandardMaterial color="#8B7355" />
      </Box>

      {/* Roof Left Side */}
      <Box args={[5.5, 0.2, 8.2]} position={[-2.3, 1.5, 0]} rotation={[0, 0, Math.PI / 6]}>
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </Box>

      {/* Roof Right Side */}
      <Box args={[5.5, 0.2, 8.2]} position={[2.3, 1.5, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </Box>

      {/* The Flawed Pipe Flashings */}
      <group position={[-1.5, 1.8, 1]}>
         {/* Good pipe */}
         <Cylinder args={[0.1, 0.1, 1]} position={[0, 0, 0]} rotation={[0,0,-Math.PI/6]}>
           <meshStandardMaterial color="#cccccc" />
         </Cylinder>
         
         {/* Flawed pipe (too close) */}
         <Cylinder 
           ref={pipeRef}
           args={[0.1, 0.1, 1]} 
           position={[0.3, -0.15, 0]} 
           rotation={[0,0,-Math.PI/6]}
           onClick={handlePipeClick}
           onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
           onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
         >
           <meshStandardMaterial color={pipeCorrected ? "#cccccc" : (hovered ? "#ff6666" : "#aa3333")} emissive={pipeCorrected ? "#000000" : "#330000"} />
         </Cylinder>

         {!pipeCorrected && (
             <Text position={[0.5, 1, 0]} fontSize={0.2} color="#ff3333" outlineWidth={0.02} outlineColor="#000">
               ! PIPES TOO CLOSE !
               (Snow damming risk)
               CLICK TO SPACE
             </Text>
         )}
      </group>

      {/* Safety Anchor Point at Peak */}
      <Box args={[0.3, 0.3, 0.3]} position={[0, 2.9, 2]}>
         <meshStandardMaterial color="#ffaa00" emissive="#553300" />
      </Box>
      <Text position={[0, 3.4, 2]} fontSize={0.15} color="#ffaa00">
         OSHA ANCHOR
      </Text>
    </group>
  );
}

function Scaffold() {
  return (
    <group position={[0, 0, 4.5]}>
      <Box args={[10, 0.2, 2]} position={[0, 1.8, 0]}>
        <meshStandardMaterial color="#b87333" />
      </Box>
      <Cylinder args={[0.05, 0.05, 4]} position={[-4.5, 0, 0]}><meshStandardMaterial color="#555" /></Cylinder>
      <Cylinder args={[0.05, 0.05, 4]} position={[4.5, 0, 0]}><meshStandardMaterial color="#555" /></Cylinder>
    </group>
  );
}

// Main logic
export default function ConstructionSimulator() {
  const [harnessAttached, setHarnessAttached] = useState(false);
  const [pipeCorrected, setPipeCorrected] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const attemptToAscend = () => {
    if (!harnessAttached) {
      setFatalError("FATAL ERROR: You attempted to ascend the roof without attaching your safety harness to the peak anchor point. In a real scenario, a fall from 30+ feet is fatal.");
    } else {
      // Good job
    }
  };

  const handleRestart = () => {
    setHarnessAttached(false);
    setPipeCorrected(false);
    setFatalError(null);
  };

  return (
    <div className="w-full h-full relative font-sans">
      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none">
        <h1 className="text-3xl font-black tracking-tighter text-orange-500 drop-shadow-[0_0_8px_rgba(255,165,0,0.8)] uppercase">
          JOBSITE SIMULATOR
        </h1>
        <h2 className="text-sm font-mono text-white opacity-80 uppercase tracking-widest mt-1">
          SCENARIO: Roofing QA & Safety
        </h2>

        <div className="mt-4 flex flex-col gap-2 pointer-events-auto max-w-sm">
           <div className={`p-3 border backdrop-blur-sm transition-colors ${harnessAttached ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-black/60 border-orange-500/30 text-orange-400'}`}>
             <p className="text-xs font-mono uppercase font-bold mb-2">1. SAFETY PROTOCOL</p>
             <button 
                onClick={() => setHarnessAttached(true)}
                disabled={harnessAttached}
                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-current text-xs tracking-widest disabled:opacity-50 transition-all font-mono"
             >
                {harnessAttached ? "HARNESS SECURED" : "ATTACH HARNESS TO ANCHOR"}
             </button>
             <button 
                onClick={attemptToAscend}
                className="w-full mt-2 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-100 text-xs tracking-widest transition-all font-mono"
             >
                ASCEND ROOF
             </button>
           </div>

           <div className={`p-3 border backdrop-blur-sm transition-colors ${pipeCorrected ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-black/60 border-orange-500/30 text-orange-400'}`}>
             <p className="text-xs font-mono uppercase font-bold mb-2">2. ARCHITECTURAL QA</p>
             <p className="text-[10px] opacity-80 leading-snug">Locate the clustered pipe flashings. In winter, this creates a snow dam causing leaks. Click the pipe in 3D to properly space it.</p>
           </div>
        </div>
      </div>

      {fatalError && (
        <div className="absolute inset-0 bg-red-900/90 z-50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md">
           <h2 className="text-6xl font-black text-white uppercase tracking-tighter mb-4 shadow-black drop-shadow-xl">FATAL CONSEQUENCE</h2>
           <p className="text-xl text-red-200 max-w-2xl font-mono leading-relaxed mb-8">{fatalError}</p>
           <button 
              onClick={handleRestart}
              className="px-6 py-3 bg-white text-red-900 font-bold uppercase tracking-widest shadow-xl hover:bg-gray-200 transition-colors"
           >
              ACKNOWLEDGE & RESTART
           </button>
        </div>
      )}

      {harnessAttached && pipeCorrected && !fatalError && (
        <div className="absolute top-6 right-6 z-10 pointer-events-auto">
          <div className="p-4 bg-green-500/20 border border-green-500/50 text-green-300 backdrop-blur-md max-w-xs text-right">
             <h3 className="text-sm font-bold uppercase tracking-widest mb-1">Scenario Complete</h3>
             <p className="text-[10px] font-mono opacity-90">Safety secured. Architecture flawed corrected. Site is ready for 155 squares of shingles.</p>
          </div>
        </div>
      )}

      <Canvas camera={{ position: [0, 4, 10], fov: 50 }}>
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />

        <group>
          {/* Ground */}
          <Box args={[40, 1, 40]} position={[0, -0.5, 0]}>
            <meshStandardMaterial color="#1a201a" />
          </Box>
          <gridHelper args={[40, 40, 0x555555, 0x222222]} />

          <Scaffold />
          <RoofModel onPipeCorrected={() => setPipeCorrected(true)} pipeCorrected={pipeCorrected} />
        </group>

        <OrbitControls 
          target={[0, 2, 0]} 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2 + 0.1}
          minDistance={3}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
}
