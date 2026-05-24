import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import { XR } from '@react-three/xr';
import { xrStore as store } from './xrStore';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GoogleGenAI } from '@google/genai';
import { useWebGLAvailable } from './webglCheck';
import { WebGLErrorBoundary } from './components/WebGLErrorBoundary';
import { motion } from 'motion/react';

// Safe retrieval of Gemini API Key to prevent ReferenceError in browser
const GEMINI_API_KEY = (() => {
  try {
    return process.env.GEMINI_API_KEY || "";
  } catch (e) {
    return "";
  }
})();

import AgencyPath, { NodeData } from './AgencyPath';
import SentientHands from './SentientHands';
import { spatialAudio } from './audio/SpatialSynth';
import { ForgeShockwave } from './components/ForgeShockwave';
import { GazeTeleporter } from './components/GazeTeleporter';

function AudioListenerUpdater() {
  const { camera } = useThree();
  useFrame(() => {
    spatialAudio.updateListener(camera);
  });
  return null;
}

const INITIAL_NODES: NodeData[] = [
  { position: new THREE.Vector3(-4, 0, -2), label: "Escape Loop (Shed)", type: 'escape', quote: "These things don't do me — I do these things.", healed: true },
  { position: new THREE.Vector3(0, 1.5, -4), label: "Roof Edge Reflex", type: 'roof', quote: "Fearless flow. Calculate. Tuck. Roll.", healed: true },
  { position: new THREE.Vector3(4, 1.0, -3), label: "Uncle's 75 Stitches", type: 'trauma', quote: "Trauma to Memory. Mind stays strong and clear.", healed: true },
  { position: new THREE.Vector3(7, 0, -2), label: "Single-Dad Rebuild", type: 'rebuild', quote: "Pressure Builds Diamonds.", healed: true },
  { position: new THREE.Vector3(-3, 2, 2), label: "Missed Opportunity", type: 'regret', quote: "I should have taken that chance when I had it.", healed: false },
  { position: new THREE.Vector3(3, 3, 1), label: "Fear of Failure", type: 'fear', quote: "What if everything I build falls apart?", healed: false },
  { position: new THREE.Vector3(0, 0.5, 3), label: "Hard Learned Lesson", type: 'lesson', quote: "Trust is earned, not freely given.", healed: false }
];

import { GazeDwellManager } from './GazeDwellManager';
import CosmicPortal from './components/CosmicPortal';

function GazeIntegration({ nodes, onHeal }: { nodes: NodeData[], onHeal: (index: number) => void }) {
  const { camera, scene, gl } = useThree();
  const dwellManagerRef = useRef<GazeDwellManager | null>(null);
  const interactiveRef = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    const manager = new GazeDwellManager(scene, camera, (target) => {
      if (target.userData.index !== undefined) {
        onHeal(target.userData.index);
      }
    });
    dwellManagerRef.current = manager;
    return () => manager.dispose();
  }, [scene, camera, onHeal]);

  useEffect(() => {
    if (dwellManagerRef.current) {
        dwellManagerRef.current.setInteractiveObjects(interactiveRef.current.filter(Boolean));
    }
  }, [nodes]);

  useFrame((state, delta) => {
    const isXR = gl.xr.isPresenting;
    if (dwellManagerRef.current) {
      dwellManagerRef.current.update(camera, delta, isXR);
    }
  });

  return (
    <group>
      {nodes.map((node, i) => (
        !node.healed && (
            <mesh 
                key={`trigger-${i}`} 
                position={node.position} 
                visible={false} 
                userData={{ index: i, type: node.type }}
                ref={(el) => { if(el) interactiveRef.current[i] = el; }}
            >
                <sphereGeometry args={[0.6]} />
            </mesh>
        )
      ))}
    </group>
  );
}

// Subtle environment particles
function AmbientParticles() {
  const pointsRef = useRef<THREE.Points>(null!);
  const particles = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const count = 300;
    const positions = new Float32Array(count * 3);
    for(let i=0; i<count*3; i++) {
       positions[i] = (Math.random() - 0.5) * 30;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0005;
      pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 2;
    }
  });

  return (
    <points ref={pointsRef} geometry={particles}>
      <pointsMaterial size={0.05} color="#00ffff" transparent opacity={0.3} sizeAttenuation depthWrite={false} toneMapped={false} />
    </points>
  );
}

// Store moved to global imported xrStore

interface ThirdEyeForgeProps {
  onNavigate?: (room: string) => void;
}

export default function ThirdEyeForge({ onNavigate }: ThirdEyeForgeProps) {
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [qiIntensity, setQiIntensity] = useState(0.5);
  const [status, setStatus] = useState("SYNCING WITH MCP ORGANISM... DRAG RAW ATOMS TO THE CENTRAL FORGE.");
  const [flashQuote, setFlashQuote] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [memoryType, setMemoryType] = useState('trauma');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [totalAtoms, setTotalAtoms] = useState<number>(INITIAL_NODES.length);

  const [themeInput, setThemeInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingSyntheses, setPendingSyntheses] = useState<number[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [shockwaveTriggers, setShockwaveTriggers] = useState<{ id: number; time: number }[]>([]);
  const controlsRef = useRef<any>(null);

  const triggerShockwave = useCallback(() => {
    setShockwaveTriggers(prev => [...prev, { id: Math.random(), time: Date.now() }]);
  }, []);

  useEffect(() => {
    if (shockwaveTriggers.length > 0) {
      const timer = setTimeout(() => {
        const now = Date.now();
        setShockwaveTriggers(prev => prev.filter(t => now - t.time < 3000));
      }, 3100);
      return () => clearTimeout(timer);
    }
  }, [shockwaveTriggers]);

  useEffect(() => {
    async function loadAtoms() {
      try {
        const res = await fetch('https://fanz-github-mcp.vercel.app/brain/atoms');
        if (!res.ok) return;
        const data = await res.json();
        const atoms = data.atoms || data;
        
        if (Array.isArray(atoms) && atoms.length > 0) {
          setTotalAtoms(atoms.length);
          // Load a subset (e.g. 15 random atoms) into the active visual forge to prevent physics overload
          const subset = atoms.sort(() => 0.5 - Math.random()).slice(0, 15);
          
          const loadedNodes: NodeData[] = subset.map((atom: any, i: number) => {
            return {
              position: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 3 + 1, (Math.random() - 0.5) * 8),
              label: atom.title || "MCP Atom",
              type: atom.category?.toLowerCase() === 'philosophy' ? 'lesson' : 
                    atom.category?.toLowerCase() === 'theory' ? 'escapeloop' : 'lesson',
              quote: atom.core || atom.title,
              healed: atom.confidence > 0.8 // high confidence atoms start healed/synthesized
            };
          });
          
          setNodes(prev => [...INITIAL_NODES, ...loadedNodes]);
          setStatus(`MCP SYNC COMPLETE. ${atoms.length} LIVING ATOMS DETECTED.`);
        }
      } catch (e) {
        console.error("Failed to load atoms", e);
        setStatus("MCP SYNC FAILED. USING LOCAL CORE.");
      }
    }
    loadAtoms();
  }, []);

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setNodes(prev => [
      ...prev,
      {
        position: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 2 + 1, (Math.random() - 0.5) * 6),
        label: `Raw ${memoryType.charAt(0).toUpperCase() + memoryType.slice(1)}`,
        type: memoryType,
        quote: inputText,
        healed: false
      }
    ]);
    setInputText("");
    setStatus("NEW RAW MEMORY DETECTED. DRAG ATOM TO FORGE TO SYNTHESIZE AGENCY.");
  };

  const handleGenerateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeInput.trim() || isGenerating) return;
    setIsGenerating(true);
    setStatus(`GENERATING SCENARIO BASED ON: "${themeInput.toUpperCase()}"...`);

    try {
      if (GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const response = await ai.models.generateContent({
           model: "gemini-3.1-flash-lite",
           contents: `You are generating a "Raw Memory" based on the following theme: "${themeInput}".
           Output a valid JSON object with the following keys:
           - label: A short label for the memory (max 3 words).
           - type: One of "trauma", "regret", "fear", or "lesson".
           - quote: A 1-2 sentence description of the raw unhealed experience.
           Output ONLY the raw JSON object, without any markdown formatting or code blocks.`,
           config: {
             responseMimeType: "application/json"
           }
        });
        
        let data;
        if (response.text) {
          data = JSON.parse(response.text.trim());
        }
        
        if (data && data.label && data.type && data.quote) {
           setNodes(prev => [
             ...prev,
             {
               position: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 2 + 1, (Math.random() - 0.5) * 6),
               label: data.label,
               type: ['trauma', 'regret', 'fear', 'lesson'].includes(data.type.toLowerCase()) ? data.type.toLowerCase() : 'trauma',
               quote: data.quote,
               healed: false
             }
           ]);
           setThemeInput("");
           setStatus(`SCENARIO GENERATED. DRAG THIS RAW ATOM TO THE FORGE.`);
        } else {
           setStatus(`GENERATION FAILED: INVALID DATA FORMAT.`);
        }
      } else {
         setStatus(`GENERATION FAILED: MISSING API KEY.`);
      }
    } catch(e: any) {
       console.error(e);
       let errorMsg = e.message;
       if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
           errorMsg = "API QUOTA EXHAUSTED - USING LOCAL FALLBACK";
       }
       setStatus(`GENERATION FAILED: ${errorMsg}`);
       
       // Fallback for demo when quota exhausted
       setTimeout(() => {
          setNodes(prev => [
             ...prev,
             {
               position: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 2 + 1, (Math.random() - 0.5) * 6),
               label: "System Memory",
               type: "lesson",
               quote: `${themeInput.toUpperCase()} - (Forged Offline)`,
               healed: false
             }
          ]);
          setTotalAtoms(prev => prev + 1);
          setThemeInput("");
          setStatus(`SCENARIO GENERATED EX SITU. DRAG THIS RAW ATOM TO THE FORGE.`);
          setIsGenerating(false);
       }, 500);
       return;
    } finally {
       setIsGenerating(false);
    }
  };

  const triggerHeal = useCallback(async (index: number) => {
    if (isSynthesizing) return;
    setIsSynthesizing(true);
    setStatus("AI SYNTHESIZING: EXTRACTING AGENCY FROM TRAUMA...");

    try {
      const nodeToHeal = nodes[index];
      let finalQuote = nodeToHeal.quote;

      // Ensure API key exists in env when running locally, in AI Studio it is provided
      if (GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const response = await ai.models.generateContent({
           model: "gemini-3.1-flash-lite",
           contents: `You are the core of a Cognitive Companion. Take this user's raw, unhealed memory/trauma and perform a 'Pinky Scar' reframing. Find the lesson, the agency, and the power in it. 
           Provide ONLY a short, punchy 1-2 sentence "Agency Asserted" quote summarizing their new power. Do not wrap in quotes or add extra intro text.
           Raw Memory: "${nodeToHeal.quote}"`
        });
        if (response.text) {
          finalQuote = response.text.trim();
        }
      } else {
        // Fallback if no key (e.g. dev environment missing var)
        finalQuote = "Agency asserted. Wisdom forged from chaos.";
      }

      setNodes(prev => {
          const newNodes = [...prev];
          if (!newNodes[index].healed) {
              newNodes[index].healed = true;
              newNodes[index].quote = finalQuote.toUpperCase();
              newNodes[index].label = "Synthesized Core";

              setQiIntensity(5.0); // MASSIVE flare up energy for visual flash
              setStatus(`SYSTEM: AGENCY ASSERTED: '${finalQuote.toUpperCase()}'`);
              setFlashQuote(finalQuote.toUpperCase());
              setTimeout(() => setFlashQuote(null), 4000);
              triggerShockwave();
              
              try { spatialAudio.playFlare(newNodes[index].position); } catch(e) {}
          }
          return newNodes;
      });
    } catch (e: any) {
      console.error(e);
      let errorMsg = e.message;
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
          errorMsg = "API QUOTA EXHAUSTED - SWITCHING TO LOCAL FORGE ENGINE";
      }
      setStatus(`SYNTHESIS ERROR: ${errorMsg}`);
      setNodes(prev => {
          const newNodes = [...prev];
          if (!newNodes[index].healed) {
              newNodes[index].healed = true;
              newNodes[index].quote = "WISDOM FORGED FROM CHAOS (LOCAL SYNTHESIS)";
              setQiIntensity(3.0);
              triggerShockwave();
          }
          return newNodes;
      });
    } finally {
      setIsSynthesizing(false);
    }
  }, [nodes, isSynthesizing]);

  const handleNodeDrop = useCallback((index: number, pos: THREE.Vector3) => {
    const forgePos = new THREE.Vector3(0, -1, -5);
    const dist = pos.distanceTo(forgePos);
    
    if (dist < 2.5) { // Threshold for Forge Tri-Polymer Binding
      triggerHeal(index);
    } else {
      // Update its position so it actually drops where dragged
      setNodes(prev => {
        const newNodes = [...prev];
        newNodes[index].position.copy(pos);
        return newNodes;
      });
      setStatus(`ATOM DROP OFFTARGET. DRAG RELEVANT RAW MEMORY INTO CENTRAL FORGE.`);
    }
  }, [triggerHeal]);

  const handlePinch = (pos: THREE.Vector3) => {
    // Find nearest node to heal when user pinches
    const threshold = 2.0;
    
    for (let i = 0; i < nodes.length; i++) {
      if (!nodes[i].healed && pos.distanceTo(nodes[i].position) < threshold) {
        triggerHeal(i);
        break;
      }
    }
  };

  const handleNodeClick = (index: number) => {
    triggerHeal(index);
  };

  useEffect(() => {
    if (!isSynthesizing && pendingSyntheses.length > 0) {
      const nextIndex = pendingSyntheses[0];
      setPendingSyntheses(prev => prev.slice(1));
      triggerHeal(nextIndex);
    }
  }, [isSynthesizing, pendingSyntheses, triggerHeal]);

  useEffect(() => {
    // Spatial synth drone removed as per user request to remove buzzing
  }, [nodes]);

  const handleSynthesizeAll = () => {
    const unhealedIndices = nodes.reduce((acc, curr, i) => {
        if (!curr.healed) acc.push(i);
        return acc;
    }, [] as number[]);
    if (unhealedIndices.length > 0) {
        setPendingSyntheses(unhealedIndices);
    } else {
        setStatus("ALL CORE ATOMS ALREADY SYNTHESIZED.");
    }
  };

  const handleSaveSession = () => {
    try {
      const data = nodes.map(n => ({
        ...n,
        position: { x: n.position.x, y: n.position.y, z: n.position.z }
      }));
      localStorage.setItem('third_eye_forge_session', JSON.stringify(data));
      setStatus('SESSION SAVED TO LOCAL STORAGE.');
    } catch (e) {
      console.error(e);
      setStatus('FAILED TO SAVE SESSION.');
    }
  };

  const handleLoadSession = () => {
    try {
      const saved = localStorage.getItem('third_eye_forge_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        const loadedNodes = parsed.map((n: any) => ({
           ...n,
           position: new THREE.Vector3(n.position.x, n.position.y, n.position.z)
        }));
        setNodes(loadedNodes);
        setTotalAtoms(loadedNodes.length);
        setStatus('SESSION LOADED FROM LOCAL STORAGE.');
      } else {
        setStatus('NO SAVED SESSION FOUND.');
      }
    } catch (e) {
      console.error(e);
      setStatus('FAILED TO LOAD SESSION.');
    }
  };

  // Decay Qi Intensity like water settling back to baseline
  useEffect(() => {
    const interval = setInterval(() => {
      setQiIntensity(prev => Math.max(0.5, prev - 0.05));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const enterVR = async () => {
    setStatus("Initiating WebXR Session...");
    try {
      await store.enterVR();
    } catch (err: any) {
      console.error(err);
      setStatus(`XR Error: ${err.message || 'Check if browser supports WebXR or open in a new tab.'}`);
    }
  };

  const forgeCoreRef = useRef<HTMLDivElement>(null);
  const isWebGL = useWebGLAvailable();

  if (!isWebGL) {
    return (
      <div className="w-full h-screen bg-[#020204] text-white flex flex-col font-sans overflow-hidden relative">
        {/* Cyber-Organic HUD */}
        <div className="absolute top-0 left-0 w-full p-6 z-[15] pointer-events-none flex justify-between items-start">
          <div className="pointer-events-auto">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-[#00ffcc] drop-shadow-[0_0_8px_rgba(0,255,204,0.8)]">
              THIRD EYE FORGE <span className="text-[10px] py-1 px-2 border border-red-500 text-red-500 rounded ml-2 align-middle font-mono uppercase tracking-[0.1em]" title="Your browser is missing WebGL support. High-Fidelity 2D mode active.">2D HIGH-FIDELITY</span>
            </h1>
            <h2 className="text-sm font-mono text-[#00ffcc] mt-1 opacity-80 tracking-[0.25em]">
              LIVING ORGANISM CORE | {totalAtoms} ATOMS
            </h2>
            <div className="mt-4 p-3 bg-black/80 border border-cyan-500/30 rounded backdrop-blur-sm max-w-lg shadow-lg shadow-[#00ffcc]/10">
              <p className="text-xs font-mono text-[#00ffcc] opacity-90 uppercase leading-snug">{status}</p>
            </div>
            
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="mt-4 pointer-events-auto px-4 py-2 bg-black/60 border border-[#00ffcc]/50 text-[#00ffcc] font-mono tracking-widest text-xs transition-colors hover:bg-[#00ffcc]/10"
            >
                {isMenuOpen ? "HIDE CONTROLS" : "SHOW CONTROLS"}
            </button>

            {isMenuOpen && (
              <div className="mt-4 max-w-md pointer-events-auto bg-black/80 border border-[#00ffcc]/30 p-4 rounded backdrop-blur-sm max-h-[60vh] overflow-y-auto custom-scrollbar">
                <form onSubmit={handleCreateMemory} className="flex flex-col gap-2">
                  <label className="text-xs font-mono tracking-widest text-[#00ffcc] opacity-70">INPUT RAW EXPERIENCE:</label>
                  <div className="flex gap-2">
                    <select 
                      value={memoryType} 
                      onChange={e => setMemoryType(e.target.value)}
                      className="bg-black/60 border border-[#00ffcc]/40 text-white p-2 rounded font-mono text-xs focus:outline-none focus:border-[#00ffcc]"
                    >
                      <option value="trauma">Trauma</option>
                      <option value="regret">Regret</option>
                      <option value="fear">Fear</option>
                      <option value="lesson">Lesson</option>
                    </select>
                    <textarea 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="resize-none flex-1 bg-black/60 border border-[#00ffcc]/40 text-white p-3 rounded font-mono text-sm focus:outline-none focus:border-[#00ffcc] shadow-[inset_0_0_10px_rgba(0,255,204,0.1)] transition-colors"
                      rows={2}
                      placeholder={`Describe your ${memoryType}...`}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={!inputText.trim()}
                    className="mt-2 py-2 bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 border border-[#00ffcc]/50 text-[#00ffcc] font-mono tracking-widest text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    CREATE RAW ATOM (UNHEALED)
                  </button>
                </form>

                <form onSubmit={handleGenerateMemory} className="mt-6 flex flex-col gap-2 border-t border-[#00ffcc]/20 pt-4">
                  <label className="text-xs font-mono tracking-widest text-[#ffcc00] opacity-70">GENERATE SCENARIO (AI):</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={themeInput}
                      onChange={(e) => setThemeInput(e.target.value)}
                      className="flex-1 bg-black/60 border border-[#ffcc00]/40 text-white p-2 rounded font-mono text-xs focus:outline-none focus:border-[#ffcc00] shadow-[inset_0_0_10px_rgba(255,204,0,0.1)] transition-colors"
                      placeholder="E.g. A difficult decision at work..."
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={!themeInput.trim() || isGenerating}
                    className="py-2 bg-[#ffcc00]/10 hover:bg-[#ffcc00]/20 border border-[#ffcc00]/50 text-[#ffcc00] font-mono tracking-widest text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? "GENERATING..." : "GENERATE AI MEMORY"}
                  </button>
                </form>

                <div className="mt-6 flex gap-2 border-t border-[#00ffcc]/20 pt-4">
                  <button 
                    onClick={handleSaveSession}
                    className="flex-1 px-4 py-2 bg-[#00ffcc]/5 hover:bg-[#00ffcc]/20 border border-[#00ffcc]/40 text-[#00ffcc] font-mono text-xs uppercase tracking-widest transition-colors shadow-[0_0_8px_rgba(0,255,204,0.1)]"
                  >
                    SAVE SESSION
                  </button>
                  <button 
                    onClick={handleLoadSession}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white/80 font-mono text-xs uppercase tracking-widest transition-colors"
                  >
                    LOAD SESSION
                  </button>
                </div>
                
                <div className="mt-2 flex">
                  <button
                    onClick={handleSynthesizeAll}
                    disabled={isSynthesizing || pendingSyntheses.length > 0 || nodes.every(n => n.healed)}
                    className="w-full px-4 py-2 bg-[#ff00ff]/10 hover:bg-[#ff00ff]/20 border border-[#ff00ff]/50 text-[#ff00ff] font-mono tracking-widest text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_8px_rgba(255,0,255,0.15)]"
                  >
                    {pendingSyntheses.length > 0 ? `SYNTHESIZING (${pendingSyntheses.length} REMAINING)...` : "SYNTHESIZE ALL"}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="pointer-events-auto flex flex-col items-end gap-2 bg-black/60 border border-cyan-500/20 p-4 rounded text-right">
             <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">3D Context Inactive</span>
             <p className="text-[9px] text-gray-400 font-mono max-w-xs leading-relaxed uppercase">
                Chrome failed to initialize 3D canvas. Running in fully-interactive 2D Vector grid. Open in a new tab or enable hardware acceleration in browser settings!
             </p>
          </div>
        </div>

        {/* 2D Grid Representation */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-20">
          <div className="relative w-[95%] h-[75%] max-w-5xl border border-[rgba(0,255,204,0.15)] bg-black/25 rounded-lg pointer-events-auto overflow-hidden shadow-[0_0_30px_rgba(0,255,204,0.055)]">
             <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(0,255,204,0.03),rgba(0,255,100,0.01),rgba(0,0,255,0.03))] bg-[size:100%_4px,_3px_100%] pointer-events-none z-10" />

             {/* Central Synthesis Ring */}
             <div ref={forgeCoreRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-1 pointer-events-auto w-32 h-32">
                <div className={`absolute inset-0 rounded-full border border-dashed border-[#00ffcc]/30 flex items-center justify-center animate-[spin_40s_linear_infinite] ${qiIntensity > 1 ? 'border-[#00ffcc]' : ''}`} />
                <div className="absolute w-28 h-28 rounded-full border border-[#00ffcc]/15 animate-[ping_4s_ease-in-out_infinite]" />
                <div className="absolute w-12 h-12 rounded-full bg-[#00ffcc]/5 border border-[#00ffcc]/30 flex items-center justify-center">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#00ffcc] animate-pulse" />
                </div>
                <span className="absolute mt-20 text-[8px] font-mono text-[#00ffcc] tracking-widest uppercase opacity-60">FORGE CORE</span>
             </div>

             {/* SVG connection lanes! */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
               <defs>
                 <linearGradient id="neonGradientLine" x1="0%" y1="0%" x2="100%" y2="100%">
                   <stop offset="0%" stopColor="#00ffcc" stopOpacity="0.6" />
                   <stop offset="100%" stopColor="#005577" stopOpacity="0.1" />
                 </linearGradient>
               </defs>
               {nodes.flatMap((nodeS, firstIdx) => 
                 nodes.slice(firstIdx + 1).map((nodeE, endIdx) => {
                   const trueEndIdx = firstIdx + 1 + endIdx;
                   if (firstIdx % 2 === 0 && trueEndIdx % 3 === 0) {
                     let x1 = ((nodeS.position.x + 6) / 12) * 100;
                     let y1 = ((nodeS.position.z + 6) / 12) * 100;
                     let x2 = ((nodeE.position.x + 6) / 12) * 100;
                     let y2 = ((nodeE.position.z + 6) / 12) * 100;
                     return (
                       <line 
                         key={`line-2d-${firstIdx}-${trueEndIdx}`}
                         x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
                         stroke="url(#neonGradientLine)"
                         strokeWidth={1}
                         strokeDasharray={nodeS.healed && nodeE.healed ? 'none' : '3 3'}
                       />
                     );
                   }
                   return null;
                 })
               )}
             </svg>

             {/* Interactive Floating Nodes */}
             {nodes.map((node, i) => {
               let xPre = ((node.position.x + 6) / 12) * 100;
               let yPre = ((node.position.z + 6) / 12) * 100;
               const nodeColor = node.healed ? '#00ffcc' : 
                                 node.type === 'trauma' ? '#ff3333' :
                                 node.type === 'fear' ? '#ffaa00' :
                                 node.type === 'regret' ? '#ff00ff' : '#00aaff';

               return (
                 <motion.div 
                   key={`node-2d-div-${i}`}
                   style={{ left: `${Math.min(94, Math.max(6, xPre))}%`, top: `${Math.min(88, Math.max(12, yPre))}%` }}
                   className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                   drag
                   dragSnapToOrigin={true}
                   dragElastic={0.2}
                   whileDrag={{ scale: 1.2, zIndex: 50 }}
                   onDragEnd={(e, info) => {
                       if (forgeCoreRef.current) {
                           const rect = forgeCoreRef.current.getBoundingClientRect();
                           if (
                               info.point.x >= rect.left && 
                               info.point.x <= rect.right && 
                               info.point.y >= rect.top && 
                               info.point.y <= rect.bottom
                           ) {
                               handleNodeClick(i);
                           }
                       }
                   }}
                   onClick={() => handleNodeClick(i)}
                 >
                    <button 
                      style={{ borderColor: nodeColor, boxShadow: `0 0 10px ${nodeColor}22` }}
                      className="relative w-7 h-7 rounded-full border bg-black/95 flex items-center justify-center transition-all hover:scale-125 focus:outline-none pointer-events-none"
                    >
                       <div 
                         style={{ backgroundColor: nodeColor }}
                         className={`w-2.5 h-2.5 rounded-full ${node.healed ? 'animate-pulse' : 'animate-ping'}`} 
                       />
                    </button>

                    {/* Popover detailed label on hover - hide while dragging */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-9 w-44 bg-black/95 border border-white/20 p-2 rounded shadow-2xl scale-0 group-hover:scale-100 transition-transform origin-top z-50 pointer-events-none opacity-100 group-active:opacity-0 group-active:scale-0">
                       <h3 className="text-[10px] font-black uppercase text-white truncate tracking-wider mb-1" style={{ color: nodeColor }}>{node.label}</h3>
                       <p className="text-[9px] font-mono text-gray-300 leading-tight">"{node.quote}"</p>
                       <div className="mt-1 border-t border-white/10 pt-1 flex justify-between items-center text-[8px] font-mono">
                          <span className="text-gray-500 uppercase">{node.type}</span>
                          <span style={{ color: nodeColor }} className="uppercase">{node.healed ? 'SYNTHESIZED' : 'DRAG TO CORE'}</span>
                       </div>
                    </div>
                 </motion.div>
               );
             })}
          </div>
        </div>

        {flashQuote && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-55 p-6 text-center pointer-events-none animate-in fade-in duration-350">
             <div className="max-w-2xl border-y border-[#00ffcc]/30 py-8 px-6">
                <span className="text-xs font-mono text-[#00ffcc] tracking-widest uppercase mb-2 block">--- AGENCY ASSERTION COMPLETED ---</span>
                <p className="text-xl md:text-2xl font-black text-white tracking-tight uppercase leading-relaxed font-sans mt-2">
                   "{flashQuote}"
                </p>
             </div>
          </div>
        )}

        <div className="absolute bottom-6 w-full text-center z-10 pointer-events-none">
          <p className="font-mono text-xs tracking-[0.3em] text-white/40">These things don't do me — I do these things</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[#020204] text-white flex flex-col font-sans overflow-hidden">
      
      {/* Cyber-Organic HUD */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
        <div className="pointer-events-auto">
          <h1 className="text-4xl font-black tracking-tighter text-[#00ffcc] drop-shadow-[0_0_8px_rgba(0,255,204,0.8)]">
            THIRD EYE FORGE
          </h1>
          <h2 className="text-sm font-mono text-[#00ffcc] mt-1 opacity-80 tracking-[0.25em]">
            LIVING ORGANISM CORE | {totalAtoms} ATOMS
          </h2>
          <div className="mt-4 p-3 bg-black/40 border border-cyan-500/30 rounded backdrop-blur-sm max-w-lg shadow-lg shadow-[#00ffcc]/10">
            <p className="text-xs font-mono text-[#00ffcc] opacity-90 uppercase leading-snug">{status}</p>
          </div>

          <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="mt-4 pointer-events-auto px-4 py-2 bg-black/60 border border-[#00ffcc]/50 text-[#00ffcc] font-mono tracking-widest text-xs transition-colors hover:bg-[#00ffcc]/10"
          >
              {isMenuOpen ? "HIDE CONTROLS" : "SHOW CONTROLS"}
          </button>

          {isMenuOpen && (
            <div className="mt-4 max-w-md pointer-events-auto bg-black/40 border border-[#00ffcc]/30 p-4 rounded backdrop-blur-sm max-h-[60vh] overflow-y-auto custom-scrollbar">
              <form onSubmit={handleCreateMemory} className="flex flex-col gap-2">
                <label className="text-xs font-mono tracking-widest text-[#00ffcc] opacity-70">INPUT RAW EXPERIENCE:</label>
                <div className="flex gap-2">
                  <select 
                    value={memoryType} 
                    onChange={e => setMemoryType(e.target.value)}
                    className="bg-black/60 border border-[#00ffcc]/40 text-white p-2 rounded font-mono text-xs focus:outline-none focus:border-[#00ffcc]"
                  >
                    <option value="trauma">Trauma</option>
                    <option value="regret">Regret</option>
                    <option value="fear">Fear</option>
                    <option value="lesson">Lesson</option>
                  </select>
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="resize-none flex-1 bg-black/60 border border-[#00ffcc]/40 text-white p-3 rounded font-mono text-sm focus:outline-none focus:border-[#00ffcc] shadow-[inset_0_0_10px_rgba(0,255,204,0.1)] transition-colors"
                    rows={2}
                    placeholder={`Describe your ${memoryType}...`}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={!inputText.trim()}
                  className="mt-2 py-2 bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 border border-[#00ffcc]/50 text-[#00ffcc] font-mono tracking-widest text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  CREATE RAW ATOM (UNHEALED)
                </button>
              </form>

              <form onSubmit={handleGenerateMemory} className="mt-6 flex flex-col gap-2 border-t border-[#00ffcc]/20 pt-4">
                <label className="text-xs font-mono tracking-widest text-[#ffcc00] opacity-70">GENERATE SCENARIO (AI):</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    className="flex-1 bg-black/60 border border-[#ffcc00]/40 text-white p-2 rounded font-mono text-xs focus:outline-none focus:border-[#ffcc00] shadow-[inset_0_0_10px_rgba(255,204,0,0.1)] transition-colors"
                    placeholder="E.g. A difficult decision at work..."
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={!themeInput.trim() || isGenerating}
                  className="py-2 bg-[#ffcc00]/10 hover:bg-[#ffcc00]/20 border border-[#ffcc00]/50 text-[#ffcc00] font-mono tracking-widest text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? "GENERATING..." : "GENERATE AI MEMORY"}
                </button>
              </form>

              <div className="mt-6 flex gap-2 border-t border-[#00ffcc]/20 pt-4">
                <button 
                  onClick={handleSaveSession}
                  className="flex-1 px-4 py-2 bg-[#00ffcc]/5 hover:bg-[#00ffcc]/20 border border-[#00ffcc]/40 text-[#00ffcc] font-mono text-xs uppercase tracking-widest transition-colors shadow-[0_0_8px_rgba(0,255,204,0.1)]"
                >
                  SAVE SESSION
                </button>
                <button 
                  onClick={handleLoadSession}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white/80 font-mono text-xs uppercase tracking-widest transition-colors"
                >
                  LOAD SESSION
                </button>
              </div>

              <div className="mt-2 flex">
                <button
                  onClick={handleSynthesizeAll}
                  disabled={isSynthesizing || pendingSyntheses.length > 0 || nodes.every(n => n.healed)}
                  className="w-full px-4 py-2 bg-[#ff00ff]/10 hover:bg-[#ff00ff]/20 border border-[#ff00ff]/50 text-[#ff00ff] font-mono tracking-widest text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_8px_rgba(255,0,255,0.15)]"
                >
                  {pendingSyntheses.length > 0 ? `SYNTHESIZING (${pendingSyntheses.length} REMAINING)...` : "SYNTHESIZE ALL"}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <button 
          className="pointer-events-auto px-8 py-3 bg-[#002222]/80 hover:bg-[#003333] border border-[#00ffcc] text-[#00ffcc] font-mono tracking-[0.2em] shadow-[0_0_15px_rgba(0,255,204,0.3)] transition-all hover:scale-105"
          onClick={enterVR}
        >
          ENTER VR (FLUID MR)
        </button>
      </div>

      <div className="absolute bottom-6 w-full text-center z-10 pointer-events-none">
        <p className="font-mono text-sm tracking-[0.3em] text-white/50">These things don't do me — I do these things</p>
      </div>

      {/* 3D Core with WebGL Crash Failover Protection */}
      <WebGLErrorBoundary fallback={<div className="flex-1 flex items-center justify-center text-xs font-mono text-orange-500 uppercase tracking-widest bg-black">WebGL Crash Detected. Activating 2D HUD Fallback...</div>}>
        <Canvas camera={{ position: [0, 2, 7] }} onPointerDown={() => spatialAudio.init()}>
          <XR store={store}>
            <AudioListenerUpdater />
            <color attach="background" args={['#010102']} />
            <ambientLight intensity={0.5} />
            
            {/* Flash light when healing triggers */}
            <pointLight position={[0, 4, 0]} intensity={qiIntensity > 2 ? 8 : 1.5} color={qiIntensity > 2 ? "#ffffff" : "#00ffcc"} />

            <EffectComposer>
              <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur intensity={1.5 + qiIntensity * 0.5} />
            </EffectComposer>

            {/* Flash Quote */}
            {flashQuote && (
              <Text position={[0, 5, -2]} fontSize={0.6} color="#ffffff" anchorX="center" anchorY="middle">
                {flashQuote}
              </Text>
            )}

            <GazeIntegration nodes={nodes} onHeal={triggerHeal} />
            <AmbientParticles />
            
            {/* Dynamic additive blending laser shockwave radiating from the Central Forge */}
            <ForgeShockwave triggers={shockwaveTriggers} />
                    {/* Subtle Cyber Grid Floor */}
            <gridHelper args={[40, 40, 0x00ffcc, 0x002222]} position={[0, -1, 0]} />

            {/* Gaze-based Teleportation on the floor grid */}
            <GazeTeleporter controlsRef={controlsRef} />

            {/* Cosmic Portals to other zones */}
            {onNavigate && (
              <group position={[0, -1, -5]}>
                 <CosmicPortal 
                    position={[-6, 2.5, 0]} 
                    label="THE VISION BOARD" 
                    targetRoom="ecosystem" 
                    onEnter={onNavigate} 
                    scale={0.7}
                  />
                  <CosmicPortal 
                    position={[0, 2.5, -3]} 
                    label="NEXUS HUB" 
                    targetRoom="hub" 
                    onEnter={onNavigate} 
                    scale={0.9}
                  />
                  <CosmicPortal 
                    position={[6, 2.5, 0]} 
                    label="3D PRINT LAB" 
                    targetRoom="print_lab" 
                    onEnter={onNavigate} 
                    scale={0.7}
                  />
              </group>
            )}

            {/* Agency Path with Knot Insertion / Healing mechanics */}
            <AgencyPath nodes={nodes} onNodeInteract={handleNodeClick} onNodeDrop={handleNodeDrop} qiIntensity={qiIntensity} />
            
            {/* Triple-Blend Sentient Hands using WebXR (fallback enabled), FABRIK, Qi Sway, Markley Averaging */}
            <SentientHands qiIntensity={qiIntensity} onPinch={handlePinch} />

            <OrbitControls ref={controlsRef} makeDefault enablePan={true} enableRotate={true} enableDamping={true} dampingFactor={0.02} rotateSpeed={1.0} zoomSpeed={1.2} />
          </XR>
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
