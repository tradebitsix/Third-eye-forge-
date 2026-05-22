import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useWebGLAvailable } from '../webglCheck';
import { WebGLErrorBoundary } from '../components/WebGLErrorBoundary';

import { XR } from '@react-three/xr';
import { xrStore as store } from '../xrStore';

export interface AgentBuild {
  id: string;
  position: THREE.Vector3;
  name: string;
  role: string;
  status: string;
  color: string;
  url?: string;
  vercelUrl?: string;
}

const COLORS = ['#00ffcc', '#ffcc00', '#ff00ff', '#ff4444', '#4444ff', '#00ff00', '#00ffff', '#ffbc00', '#ff0077', '#aa00ff'];

function IntroAnimation({ onIntroComplete }: { onIntroComplete: () => void }) {
  const theRef = useRef<THREE.Group>(null!);
  const visionRef = useRef<THREE.Group>(null!);
  const boardRef = useRef<THREE.Group>(null!);
  const groupRef = useRef<THREE.Group>(null!);

  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 1: THE and VISION shoot up from bottom
    setStage(1);
    
    // Stage 2: BOARD falls straight down
    const t1 = setTimeout(() => {
      setStage(2);
    }, 2000);

    // Stage 3: Quote appears
    const t2 = setTimeout(() => {
      setStage(3);
    }, 3500);

    // Stage 4: Galaxy transition
    const t3 = setTimeout(() => {
      setStage(4);
    }, 6000);

    // Done
    const t4 = setTimeout(() => {
      onIntroComplete();
    }, 8000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onIntroComplete]);

  useFrame((state, delta) => {
    if (stage >= 1) {
      if (theRef.current) {
        // Starts low left, comes up and stops firmly
        theRef.current.position.y = THREE.MathUtils.lerp(theRef.current.position.y, 2, delta * 4);
        theRef.current.position.x = THREE.MathUtils.lerp(theRef.current.position.x, -2.5, delta * 4);
        theRef.current.position.z = THREE.MathUtils.lerp(theRef.current.position.z, -3, delta * 4);
      }
      if (visionRef.current) {
        // Starts low right, comes up and stops firmly
        visionRef.current.position.y = THREE.MathUtils.lerp(visionRef.current.position.y, 2, delta * 4);
        visionRef.current.position.x = THREE.MathUtils.lerp(visionRef.current.position.x, 2.5, delta * 4);
        visionRef.current.position.z = THREE.MathUtils.lerp(visionRef.current.position.z, -3, delta * 4);
      }
    }
    
    if (stage >= 2 && boardRef.current) {
      // BOARD falls from above to middle
      boardRef.current.position.y = THREE.MathUtils.lerp(boardRef.current.position.y, -0.5, delta * 10);
    }

    if (stage === 4 && groupRef.current) {
      groupRef.current.scale.lerp(new THREE.Vector3(0, 0, 0), delta * 4);
      groupRef.current.rotation.z += delta;
      groupRef.current.position.z -= delta * 15;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group ref={theRef} position={[-15, -15, -10]}>
        <Text fontSize={2.5} color="#00ffcc" anchorX="center" anchorY="middle">
          THE
        </Text>
      </group>
      <group ref={visionRef} position={[15, -15, -10]}>
        <Text fontSize={2.5} color="#00ffcc" anchorX="center" anchorY="middle">
          VISION
        </Text>
      </group>
      <group ref={boardRef} position={[0, 20, -2]}>
        <Text fontSize={3} color="#ff00ff" anchorX="center" anchorY="middle">
          BORED
        </Text>
      </group>

      {stage >= 3 && (
         <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5}>
           <Text position={[0, -3, 0]} fontSize={0.4} color="#aaaaaa" maxWidth={8} textAlign="center">
             "Our automated world, architecting reality from the virtual expanse."
           </Text>
         </Float>
      )}
    </group>
  );
}

function AgentGalaxy({ agents, selectedAgent, onSelectAgent }: { agents: AgentBuild[], selectedAgent: AgentBuild | null, onSelectAgent: (agent: AgentBuild | null) => void }) {
  const groupRef = useRef<THREE.Group>(null!);
  const { camera, scene } = useThree();
  const controlsRef = useRef<any>(null!);
  
  useFrame((state, delta) => {
    if (groupRef.current && !selectedAgent) {
      groupRef.current.rotation.y += delta * 0.05;
    }

    if (selectedAgent && controlsRef.current) {
      // Get world position of the selected agent
      const targetPos = new THREE.Vector3().copy(selectedAgent.position);
      if (groupRef.current) {
         groupRef.current.localToWorld(targetPos);
      }

      // Desired camera position
      const camTarget = targetPos.clone().add(new THREE.Vector3(0, 0.5, 3));
      
      camera.position.lerp(camTarget, delta * 3);
      controlsRef.current.target.lerp(targetPos, delta * 3);
      controlsRef.current.update();
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        {agents.map((agent, i) => (
          <Float key={agent.id} speed={2} rotationIntensity={0.5} floatIntensity={selectedAgent === agent ? 0.2 : 2}>
             <group 
                position={agent.position} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onSelectAgent(agent); 
                }}
             >
                <mesh>
                   <icosahedronGeometry args={[0.5, 1]} />
                   <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={0.3} wireframe transparent opacity={0.6} />
                </mesh>
                <mesh>
                   <boxGeometry args={[0.7, 0.7, 0.7]} />
                   <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={0.2} wireframe transparent opacity={0.2} />
                </mesh>
                <pointLight color={agent.color} intensity={2} distance={3} />
                
                {selectedAgent !== agent && (
                  <Html center position={[0, -1, 0]}>
                    <div className="bg-black/80 border border-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg text-center pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.1)] w-max">
                      <h3 className="text-white text-[11px] font-black tracking-widest">{agent.name}</h3>
                      <p className="text-[9px] font-mono uppercase mt-0.5" style={{ color: agent.color }}>{agent.role}</p>
                    </div>
                  </Html>
                )}
             </group>
          </Float>
        ))}
      </group>
      
      <OrbitControls 
        ref={controlsRef}
        enablePan={true} 
        enableRotate={true} 
        enableZoom={true}
        autoRotate={!selectedAgent}
        autoRotateSpeed={0.5} 
      />
    </>
  );
}

export default function EcosystemGalaxy() {
  const [introDone, setIntroDone] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentBuild | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [agents, setAgents] = useState<AgentBuild[]>([]);

  // Automatically mark intro as complete on load if in 2D fallback to provide instant response
  const isWebGL = useWebGLAvailable();

  useEffect(() => {
    if (!isWebGL) {
      setIntroDone(true);
    }
  }, [isWebGL]);

  useEffect(() => {
    async function loadMCP() {
      try {
        const res = await fetch('https://fanz-github-mcp.vercel.app/repos');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.repos) {
          const loadedAgents: AgentBuild[] = data.repos.map((repo: any, i: number) => {
            const angle = i * 0.5;
            const radius = 2 + (i * 0.3);
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (Math.random() - 0.5) * 5;
            return {
              id: repo.name || `node-${i}`,
              position: new THREE.Vector3(x, y, z),
              name: repo.name.replace(/-/g, ' ').trim(),
              role: repo.language || 'Unknown Stack',
              status: repo.vercel_url ? 'Deployed (Vercel)' : 'Staging',
              color: COLORS[i % COLORS.length],
              url: repo.url,
              vercelUrl: repo.vercel_url,
            };
          });
          setAgents(loadedAgents);
        }
      } catch (err) {
        console.error("Failed to load MCP repos", err);
      }
    }
    loadMCP();
  },[]);

  return (
    <div className="w-full h-screen bg-[#010103] text-white flex flex-col font-sans overflow-hidden relative">
      
      {!isWebGL && (
        <>
          {/* HUD overlay */}
          <div className="absolute top-0 left-0 w-full p-6 z-[15] pointer-events-none flex justify-between items-start">
            <div className="pointer-events-auto">
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-[#ffcc00] drop-shadow-[0_0_8px_rgba(255,204,0,0.8)]">
                THE VISION BOARD <span className="text-[10px] py-1 px-2 border border-red-500 text-red-500 rounded ml-2 align-middle font-mono uppercase tracking-[0.1em]" title="Your browser is missing WebGL support. High-Fidelity 2D mode active.">2D HIGH-FIDELITY</span>
              </h1>
              <h2 className="text-sm font-mono text-[#ffcc00] mt-1 opacity-80 tracking-[0.25em]">
                LIVE INDEX & REALITY MATRIX | {agents.length || 6} NODES
              </h2>
              
              {selectedAgent && (
                 <div 
                   style={{ borderColor: selectedAgent.color }}
                   className="mt-6 p-4 bg-black/85 border border-[#ffcc00]/20 rounded-lg backdrop-blur-md max-w-sm shadow-xl shadow-black/80 pointer-events-auto"
                 >
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: selectedAgent.color }} />
                     <h3 className="text-lg font-black uppercase text-white tracking-widest">{selectedAgent.name}</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
                      <div className="text-gray-500 text-[10px] uppercase">ROLE</div>
                      <div className="text-white text-right text-[11px] truncate">{selectedAgent.role}</div>
                      <div className="text-gray-500 text-[10px] uppercase">STATUS</div>
                      <div className="text-[#00ffcc] text-right font-bold text-[11px] uppercase">{selectedAgent.status}</div>
                   </div>
                   <div className="mt-4 flex flex-col gap-2">
                     {selectedAgent.url && (
                       <button
                         onClick={() => window.open(selectedAgent.url, '_blank')}
                         className="w-full py-2 bg-white/10 hover:bg-white/20 transition-colors uppercase font-mono text-[9px] tracking-widest border border-white/20"
                       >
                         VIEW GITHUB REPO
                       </button>
                     )}
                     {selectedAgent.vercelUrl && (
                       <button
                         onClick={() => window.open(selectedAgent.vercelUrl, '_blank')}
                         className="w-full py-2 bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 transition-colors uppercase font-mono text-[9px] tracking-widest border border-[#00ffcc]/30 text-[#00ffcc]"
                       >
                         LAUNCH VERCEL DEPLOY
                       </button>
                     )}
                   </div>
                 </div>
              )}
            </div>

            <div className="pointer-events-auto flex flex-col items-end gap-2 bg-black/60 border border-amber-500/10 p-4 rounded text-right">
               <span className="text-[10px] text-amber-500 font-mono uppercase tracking-widest">3D Context Unavailable</span>
               <p className="text-[9px] text-gray-400 font-mono max-w-xs leading-relaxed uppercase">
                  Hardware acceleration is restricted. Rendered interactive 2D Ecosystem Board. Hover nodes to inspect, click to bind active view deck!
               </p>
               <button
                 onClick={() => setShowMap(!showMap)}
                 className="mt-2 px-4 py-1.5 bg-blue-500/15 hover:bg-blue-500/35 border border-blue-500/50 text-blue-400 font-mono text-[9px] tracking-widest transition-all rounded uppercase"
               >
                 {showMap ? 'HIDE MAP' : 'OPEN COLOURED THUMBNAILS'}
               </button>
            </div>
          </div>

          {/* 2D Constellation Vector map */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-20">
            <div className="relative w-[95%] h-[75%] max-w-5xl border border-[rgba(255,204,0,0.15)] bg-black/25 rounded-lg pointer-events-auto overflow-hidden shadow-[inset_0_0_30px_rgba(255,204,0,0.03)]">
               <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,204,0,0.02),rgba(0,255,204,0.01),rgba(0,0,255,0.04))] bg-[size:100%_4px,_3px_100%] pointer-events-none z-10" />

               {/* Central Core */}
               <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-1 pointer-events-none">
                  <div className="w-36 h-36 rounded-full border border-dashed border-[#ffcc00]/20 flex items-center justify-center animate-[spin_60s_linear_infinite]" />
                  <div className="absolute w-44 h-44 rounded-full border border-dashed border-[#ffcc00]/5 animate-[spin_80s_linear_infinite_reverse]" />
                  <div className="absolute w-14 h-14 rounded-full bg-[#ffcc00]/5 border border-[#ffcc00]/30 flex items-center justify-center">
                     <div className="w-2 h-2 rounded-full bg-[#ffcc00] animate-pulse" />
                  </div>
                  <span className="absolute mt-24 text-[8px] font-mono text-[#ffcc00] tracking-widest uppercase opacity-60">NEXUS CORE</span>
               </div>

               {/* Circular constellation grid */}
               <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                 <defs>
                   <linearGradient id="neonGradientLineEcosystem" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" stopColor="#ffcc00" stopOpacity="0.4" />
                     <stop offset="100%" stopColor="#aa00ff" stopOpacity="0.05" />
                   </linearGradient>
                 </defs>
                 {agents.map((agent, i) => {
                   const angle = (i * 2 * Math.PI) / (agents.length || 1);
                   const x = 50 + 26 * Math.cos(angle);
                   const y = 50 + 32 * Math.sin(angle);
                   return (
                     <line 
                       key={`line-ecosystem-${agent.id}`}
                       x1="50%" y1="50%" x2={`${x}%`} y2={`${y}%`}
                       stroke="url(#neonGradientLineEcosystem)"
                       strokeWidth={1}
                       className="opacity-50"
                     />
                   );
                 })}
               </svg>

               {/* Interactive orbiting buttons */}
               {agents.map((agent, i) => {
                 const angle = (i * 2 * Math.PI) / (agents.length || 1);
                 const x = 50 + 26 * Math.cos(angle);
                 const y = 50 + 32 * Math.sin(angle);
                 const isSelected = selectedAgent?.id === agent.id;

                 return (
                   <div 
                     key={`node-ecosystem-div-${agent.id}`}
                     style={{ left: `${x}%`, top: `${y}%` }}
                     className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                   >
                      <button 
                        onClick={() => setSelectedAgent(agent)}
                        style={{ 
                          borderColor: agent.color, 
                          boxShadow: isSelected ? `0 0 15px ${agent.color}` : `0 0 8px ${agent.color}22` 
                        }}
                        className={`relative rounded-full border bg-black/95 flex items-center justify-center transition-all hover:scale-130 focus:outline-none ${isSelected ? 'w-9 h-9' : 'w-7 h-7'}`}
                      >
                         <div 
                           style={{ backgroundColor: agent.color }}
                           className={`rounded-full ${isSelected ? 'w-3.5 h-3.5 animate-pulse' : 'w-1.5 h-1.5 animate-ping'}`} 
                         />
                      </button>

                      <div className="absolute left-1/2 -translate-x-1/2 top-11 w-44 bg-black/95 border border-white/20 p-2 rounded shadow-2xl scale-0 group-hover:scale-100 transition-transform origin-top z-50 pointer-events-none">
                         <h3 className="text-[10px] font-black uppercase text-white truncate tracking-wider mb-1" style={{ color: agent.color }}>{agent.name}</h3>
                         <p className="text-[9px] font-mono text-gray-300 leading-tight block truncate">STACK: {agent.role}</p>
                         <div className="mt-1 border-t border-white/10 pt-1 flex justify-between items-center text-[8px] font-mono">
                            <span className="text-gray-500 uppercase">NODE #{i+1}</span>
                            <span className="text-green-400 uppercase text-[7px]">OPERATIONAL</span>
                         </div>
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>

          {/* Coloured Thumbnails Grid */}
          {showMap && (
            <div className="absolute bottom-4 right-4 w-full md:w-[600px] p-4 z-40 pointer-events-none">
              <div className="pointer-events-auto bg-black/90 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-[0_0_50px_rgba(255,204,0,0.15)]">
                 <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2 border-dashed">
                    <h3 className="font-mono text-[10px] text-[#ffcc00] uppercase tracking-widest mb-1 shadow-[0_0_10px_rgba(255,255,255,0.1)]">Ecosystem Nodes (2D Slider deck)</h3>
                    <button onClick={() => setShowMap(false)} className="text-gray-400 hover:text-white">&times;</button>
                 </div>
                 
                 <div className="overflow-x-auto flex gap-4 pb-2 snap-x hide-scrollbar">
                    {agents.map(agent => (
                      <div 
                        key={`fallback-thumb-${agent.id}`}
                        onClick={() => setSelectedAgent(agent)}
                        className="snap-start flex-shrink-0 w-36 h-24 bg-white/5 border hover:bg-white/10 transition-colors border-white/10 rounded overflow-hidden relative cursor-pointer group flex flex-col justify-end p-2"
                        style={{ borderBottomWidth: 3, borderBottomColor: agent.color }}
                      >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />
                          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full z-20" style={{ backgroundColor: agent.color, boxShadow: `0 0 10px ${agent.color}` }} />
                          <div className="relative z-20">
                             <p className="text-[9px] font-black uppercase text-white truncate drop-shadow-md">{agent.name}</p>
                             <p className="text-[8px] font-mono text-gray-300 uppercase truncate" style={{ color: agent.color }}>{agent.role}</p>
                          </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}
        </>
      )}

      {isWebGL && (
        <>
          {/* 2D Overlay HUD */}
          {introDone && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start"
        >
          <div className="pointer-events-auto">
            {selectedAgent && (
               <motion.div 
                 initial={{ x: -50, opacity: 0 }}
                 animate={{ x: 0, opacity: 1 }}
                 className="mt-6 p-4 bg-black/60 border rounded backdrop-blur-md max-w-sm"
                 style={{ borderColor: selectedAgent.color }}
               >
                 <div className="flex items-center gap-2 mb-2">
                   <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: selectedAgent.color }} />
                   <h3 className="text-lg font-black uppercase text-white tracking-widest">{selectedAgent.name}</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
                    <div className="text-gray-500">ROLE</div>
                    <div className="text-white text-right">{selectedAgent.role}</div>
                    <div className="text-gray-500">STATUS</div>
                    <div className="text-white text-right">{selectedAgent.status}</div>
                 </div>
                 <div className="mt-4 flex flex-col gap-2">
                   {selectedAgent.url && (
                     <button
                       onClick={() => window.open(selectedAgent.url, '_blank')}
                       className="w-full py-2 bg-white/10 hover:bg-white/20 transition-colors uppercase font-mono text-[10px] tracking-widest border border-white/20"
                     >
                       VIEW GITHUB REPO
                     </button>
                   )}
                   {selectedAgent.vercelUrl && (
                     <button
                       onClick={() => window.open(selectedAgent.vercelUrl, '_blank')}
                       className="w-full py-2 bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 transition-colors uppercase font-mono text-[10px] tracking-widest border border-[#00ffcc]/30 text-[#00ffcc]"
                     >
                       LAUNCH VERCEL DEPLOY
                     </button>
                   )}
                 </div>
               </motion.div>
            )}
          </div>

          <div className="flex flex-col items-end pointer-events-auto">
             <button 
               onClick={async () => {
                 try { await store.enterVR(); } 
                 catch(e) { console.error(e); alert("VR not supported on this device.");}
               }}
               className="mb-4 px-6 py-2 bg-[#ffcc00]/20 hover:bg-[#ffcc00]/40 border border-[#ffcc00] text-[#ffcc00] font-mono text-[10px] tracking-[0.2em] transition-all rounded shadow-[0_0_15px_rgba(255,204,0,0.2)]"
             >
               ENTER VR
             </button>

             {/* Holographic Treasure Map Toggle */}
             <button
               onClick={() => setShowMap(!showMap)}
               className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/30 border border-blue-500 text-blue-400 font-mono text-[10px] tracking-widest transition-all rounded"
             >
               {showMap ? 'HIDE MAP' : 'OPEN ECOSYSTEM MAP'}
             </button>
          </div>
        </motion.div>
      )}

      {/* Holographic Swipe Map Overlay */}
      <AnimatePresence>
         {introDone && showMap && (
           <motion.div
             initial={{ y: "100%", opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             exit={{ y: "100%", opacity: 0 }}
             transition={{ type: "spring", damping: 20 }}
             className="absolute bottom-0 right-0 w-full md:w-[600px] p-4 z-20 pointer-events-none"
           >
             <div className="pointer-events-auto bg-black/80 backdrop-blur-xl border-t border-l border-white/20 p-4 rounded-tl-xl shadow-[0_0_50px_rgba(0,100,255,0.2)]">
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                   <h3 className="font-mono text-xs text-white uppercase tracking-widest mb-1 shadow-[0_0_10px_rgba(255,255,255,0.5)]">Ecosystem Nodes (Swipeable)</h3>
                   <button onClick={() => setShowMap(false)} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                
                <div className="overflow-x-auto flex gap-4 pb-4 snap-x hide-scrollbar">
                   {agents.map(agent => (
                     <div 
                       key={agent.id}
                       onClick={() => setSelectedAgent(agent)}
                       className="snap-start flex-shrink-0 w-40 h-28 bg-white/5 border hover:bg-white/10 transition-colors border-white/10 rounded overflow-hidden relative cursor-pointer group flex flex-col justify-end p-2"
                       style={{ borderBottomWidth: 3, borderBottomColor: agent.color }}
                     >
                         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                         <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full z-20" style={{ backgroundColor: agent.color, boxShadow: `0 0 10px ${agent.color}` }} />
                         <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-30 transition-opacity duration-500 bg-cover bg-center" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }} />
                         <div className="relative z-20">
                            <p className="text-[10px] font-black uppercase text-white truncate drop-shadow-md">{agent.name}</p>
                            <p className="text-[8px] font-mono text-gray-300 uppercase truncate" style={{ color: agent.color }}>{agent.role}</p>
                         </div>
                     </div>
                   ))}
                </div>
                <p className="text-[9px] text-gray-500 font-mono mt-1 text-center uppercase tracking-widest">Select thumbnail to focus agent</p>
             </div>
           </motion.div>
         )}
      </AnimatePresence>

<WebGLErrorBoundary fallback={<div className="flex-1 flex items-center justify-center text-xs font-mono text-orange-500 uppercase tracking-widest bg-black">WebGL Crash Detected. Activating 2D HUD Fallback...</div>}>
      <Canvas camera={{ position: [0, 2, 10] }} className="absolute inset-0">
        <XR store={store}>
          <color attach="background" args={['#010103']} />
          <ambientLight intensity={0.5} />
          <EffectComposer>
            <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur intensity={1.5} />
          </EffectComposer>

          {!introDone ? (
            <IntroAnimation onIntroComplete={() => setIntroDone(true)} />
          ) : (
             <group>
                <AgentGalaxy agents={agents} selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} />
             </group>
          )}
        </XR>
      </Canvas>
      </WebGLErrorBoundary>
        </>
      )}
    </div>
  );
}
