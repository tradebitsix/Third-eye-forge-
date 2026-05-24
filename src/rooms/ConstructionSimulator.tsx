import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Text, useCursor, Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { XR, createXRStore } from '@react-three/xr';
import { useWebGLAvailable } from '../webglCheck';
import { WebGLErrorBoundary } from '../components/WebGLErrorBoundary';

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

  const isWebGL = useWebGLAvailable();

  return (
    <div className="w-full h-full relative font-sans">
      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none">
        <h1 className="text-3xl font-black tracking-tighter text-orange-500 drop-shadow-[0_0_8px_rgba(255,165,0,0.8)] uppercase">
          JOBSITE SIMULATOR {!isWebGL && <span className="text-[9px] font-mono tracking-widest text-[#ef4444] border border-[#ef4444] px-1.5 py-0.5 rounded ml-2 align-middle">2D CAD</span>}
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
             <p className="text-[10px] opacity-80 leading-snug">Locate the clustered pipe flashings. In winter, this creates a snow dam causing leaks. Click the pipe to properly space it.</p>
           </div>
        </div>
      </div>

      {fatalError && (
        <div className="absolute inset-0 bg-red-900/95 z-50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md">
           <h2 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4 shadow-black drop-shadow-xl animate-bounce">FATAL CONSEQUENCE</h2>
           <p className="text-lg md:text-xl text-red-200 max-w-2xl font-mono leading-relaxed mb-8">{fatalError}</p>
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

      {!isWebGL ? (
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#080d1e] border-t border-blue-500/10 pointer-events-auto">
           {/* Cyber Blueprint container */}
           <div className="relative w-full max-w-4xl h-[70%] max-h-[460px] bg-[#050b18] border border-blue-500/30 rounded-lg shadow-[inset_0_0_50px_rgba(30,80,255,0.12)] overflow-hidden flex flex-col justify-between p-5">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(30,80,255,0.015)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(30,80,255,0.015)_1px,_transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
              
              <div className="flex justify-between items-start border-b border-blue-500/20 pb-2 border-dashed">
                 <div>
                    <h3 className="text-xs font-bold font-mono tracking-widest text-blue-400 uppercase">CAD SYSTEM DECK v1.02</h3>
                    <p className="text-[8px] font-mono text-gray-500 mt-0.5 uppercase">GRID REF COMPILING | SCALE 1:40 | HIGH-FIDELITY 2D VECTOR BLUEPRINT</p>
                 </div>
                 <div className="py-0.5 px-1.5 border border-blue-500/20 text-blue-400 text-[8px] font-mono rounded">
                    OSHA DIRECTIVE ACTIVE
                 </div>
              </div>

              {/* The Blueprint Drawing */}
              <div className="flex-1 flex items-center justify-center relative my-2">
                 <svg className="w-full h-full max-h-[240px] pointer-events-auto" viewBox="0 0 600 300">
                    {/* The ground platform */}
                    <line x1="50" y1="260" x2="550" y2="260" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="4 4" />
                    
                    {/* The scaffold structure */}
                    <rect x="100" y="140" width="100" height="120" fill="none" stroke="#2563eb" strokeWidth="1.5" />
                    <line x1="100" y1="140" x2="200" y2="260" stroke="#1e40af" strokeWidth="1" />
                    <line x1="200" y1="140" x2="100" y2="260" stroke="#1e40af" strokeWidth="1" />
                    <line x1="100" y1="200" x2="200" y2="200" stroke="#2563eb" strokeWidth="1.5" />

                    {/* The main roof truss incline */}
                    <polygon points="240,260 390,100 540,260" fill="none" stroke="#94a3b8" strokeWidth="3" />
                    
                    {/* Scaffold guards */}
                    <line x1="85" y1="140" x2="100" y2="140" stroke="#ef4444" strokeWidth="2" />
                    <line x1="85" y1="200" x2="100" y2="200" stroke="#ef4444" strokeWidth="2" />
                    
                    {/* peak harness Anchor point */}
                    <circle cx="390" cy="100" r="8" fill="none" stroke="#10b981" strokeWidth="2" className={harnessAttached ? "animate-pulse" : ""} />
                    <text x="390" y="85" fill="#10b981" fontSize="9" textAnchor="middle" fontFamily="monospace" className="font-bold">ANCHOR PEAK</text>
                    
                    {/* Pipe flashings */}
                    <rect x="420" y="140" width="12" height="24" fill={pipeCorrected ? "#10b981" : "#f59e0b"} stroke={pipeCorrected? "#10b981":"#f59e0b"} strokeWidth="1" />
                    <circle cx="426" cy="140" r="3" fill="#ffffff" />
                    
                    {/* Flashing 2 */}
                    <g 
                      onClick={() => !pipeCorrected && setPipeCorrected(true)} 
                      className={`cursor-pointer group select-none ${pipeCorrected ? "transition-all duration-1000 ease-out" : "animate-pulse"}`}
                      style={{ transform: `translateX(${pipeCorrected ? '60px' : '6px'})` }}
                    >
                       <rect x="420" y="140" width="12" height="24" fill={pipeCorrected ? "#10b981" : "#ef4444"} stroke={pipeCorrected ? "#10b981" : "#ef4444"} strokeWidth="1.5" className="hover:opacity-80" />
                       <circle cx="426" cy="140" r="3" fill="#ffffff" />
                       
                       {!pipeCorrected && (
                         <text x="426" y="125" fill="#ef4444" fontSize="8" textAnchor="middle" fontFamily="monospace" className="font-mono font-bold uppercase">CORRECT INTERFERENCE</text>
                       )}
                    </g>
                    
                    {/* Lifeline cord */}
                    {harnessAttached && (
                      <line x1="200" y1="130" x2="390" y2="100" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" className="animate-pulse" />
                    )}
                 </svg>

                 {/* Vector HUD details */}
                 <div className="absolute bottom-1 left-2 text-[8px] font-mono text-blue-400 flex gap-4 uppercase">
                    <span>SPAN: 30'</span>
                    <span>PITCH: 12:12</span>
                    <span>HARNESS: {harnessAttached ? "LIFT CLEARED" : "RESTRICTED"}</span>
                 </div>
                 
                 {!pipeCorrected && (
                   <div className="absolute right-4 top-2 block p-2 bg-red-950/40 border border-red-500/30 text-red-400 font-mono text-[8px] max-w-[150px] uppercase leading-tight animate-bounce rounded pointer-events-none">
                      ⚠ INTERFERENCE: pipe flash spacing is under 6". Click Red Pipe on CAD diagram to correct spacing.
                   </div>
                 )}
              </div>

              <div className="flex justify-between items-center border-t border-blue-500/20 pt-2 border-dashed">
                 <span className="text-[8px] font-mono text-gray-500">STABILITY INDEX OK</span>
                 <div className="text-[8px] text-gray-400 font-mono uppercase bg-blue-950/40 py-0.5 px-2 border border-blue-500/5">
                    WebGL skipped gracefully. Displaying active draft layer.
                 </div>
              </div>
           </div>
        </div>
      ) : (
        <WebGLErrorBoundary fallback={<div className="flex-1 flex items-center justify-center text-xs font-mono text-orange-400 uppercase tracking-widest bg-[#050505]">WebGL Crash Detected. Activating 2D Active Layout...</div>}>
          <Canvas camera={{ position: [0, 4, 10], fov: 50 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 10, 5]} intensity={2.0} castShadow />

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
              enableDamping={true}
              dampingFactor={0.02}
              rotateSpeed={1.0}
              zoomSpeed={1.2}
              minPolarAngle={0} 
              maxPolarAngle={Math.PI / 2 + 0.1}
              minDistance={3}
              maxDistance={15}
            />
          </Canvas>
        </WebGLErrorBoundary>
      )}
    </div>
  );
}
