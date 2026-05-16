import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GoogleGenAI } from '@google/genai';

import AgencyPath, { NodeData } from './AgencyPath';
import SentientHands from './SentientHands';

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

const store = createXRStore({
  hand: true, // enables generic-hand
});

export default function ThirdEyeForge() {
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [qiIntensity, setQiIntensity] = useState(0.5);
  const [status, setStatus] = useState("DRAG RAW BATTLE WOUNDS TO THE CENTRAL FORGE. TRI-POLYMER BINDING ENGAGED.");
  const [flashQuote, setFlashQuote] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [memoryType, setMemoryType] = useState('trauma');
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const [themeInput, setThemeInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
       setStatus(`GENERATION FAILED: ${e.message}`);
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
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
          }
          return newNodes;
      });
    } catch (e: any) {
      console.error(e);
      setStatus(`SYNTHESIS FAILED: USING FALLBACK. ${e.message}`);
      setNodes(prev => {
          const newNodes = [...prev];
          newNodes[index].healed = true;
          newNodes[index].quote = "AGENCY ASSERTED (FALLBACK)";
          setQiIntensity(3.0);
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

  return (
    <div className="w-full h-screen bg-[#020204] text-white flex flex-col font-sans overflow-hidden">
      
      {/* Cyber-Organic HUD */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
        <div className="pointer-events-auto">
          <h1 className="text-4xl font-black tracking-tighter text-[#00ffcc] drop-shadow-[0_0_8px_rgba(0,255,204,0.8)]">
            THIRD EYE FORGE
          </h1>
          <h2 className="text-sm font-mono text-[#00ffcc] mt-1 opacity-80 tracking-[0.25em]">
            LIVING ORGANISM CORE | {nodes.length} ATOMS
          </h2>
          <div className="mt-4 p-3 bg-black/40 border border-cyan-500/30 rounded backdrop-blur-sm max-w-lg shadow-lg shadow-[#00ffcc]/10">
            <p className="text-xs font-mono text-[#00ffcc] opacity-90 uppercase leading-snug">{status}</p>
          </div>

          <form onSubmit={handleCreateMemory} className="mt-6 flex flex-col gap-2 max-w-md pointer-events-auto">
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

          <form onSubmit={handleGenerateMemory} className="mt-4 flex flex-col gap-2 max-w-md pointer-events-auto border-t border-[#00ffcc]/20 pt-4">
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

      {/* 3D Core */}
      <Canvas camera={{ position: [0, 2, 7] }}>
        <XR store={store}>
          <color attach="background" args={['#010102']} />
          <ambientLight intensity={0.2} />
          
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
          
          {/* Subtle Cyber Grid Floor */}
          <gridHelper args={[40, 40, 0x00ffcc, 0x002222]} position={[0, -1, 0]} />

          {/* Agency Path with Knot Insertion / Healing mechanics */}
          <AgencyPath nodes={nodes} onNodeInteract={handleNodeClick} onNodeDrop={handleNodeDrop} qiIntensity={qiIntensity} />
          
          {/* Triple-Blend Sentient Hands using WebXR (fallback enabled), FABRIK, Qi Sway, Markley Averaging */}
          <SentientHands qiIntensity={qiIntensity} onPinch={handlePinch} />

          <OrbitControls enablePan={true} enableRotate={true} />
          <Environment preset="night" />
        </XR>
      </Canvas>
    </div>
  );
}
