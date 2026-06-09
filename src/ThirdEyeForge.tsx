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
import QiParticleSystem from './components/QiParticleSystem';
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
import { FanzoHolo, EchoHolo } from './components/HoloAgents';

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
  const synthesizingCount = nodes.filter(n => n.synthesizing).length;
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
  const [qiMapEnabled, setQiMapEnabled] = useState(false);
  const [shockwaveTriggers, setShockwaveTriggers] = useState<{ id: number; time: number }[]>([]);
  const controlsRef = useRef<any>(null);

  // Agentic City v11 - Companion Overlay Swappers and State Controls
  const [activeCompanion, setActiveCompanion] = useState<'none' | 'echo' | 'fanzo'>('none');
  const [companionMsg, setCompanionMsg] = useState<string>("");
  const [isCompanionVoiceActive, setIsCompanionVoiceActive] = useState(false);
  const [isCompanionWatching, setIsCompanionWatching] = useState(true);

  const starfieldRef = useRef<HTMLCanvasElement | null>(null);
  const holoOrbCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Starfield dynamic generation loop
  useEffect(() => {
    const canvas = starfieldRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let id: number;
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 1.6 + 0.4,
      speed: Math.random() * 0.15 + 0.04,
      alpha: Math.random() * 0.7 + 0.3,
      fade: (Math.random() * 0.008 + 0.003) * (Math.random() > 0.5 ? 1 : -1)
    }));

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    const run = () => {
      ctx.clearRect(0, 0, w, h);
      stars.forEach(s => {
        s.y -= s.speed;
        if (s.y < 0) {
          s.y = h;
          s.x = Math.random() * w;
        }
        s.alpha += s.fade;
        if (s.alpha > 1 || s.alpha < 0.2) {
          s.fade = -s.fade;
        }
        s.alpha = Math.max(0.2, Math.min(1, s.alpha));
        ctx.fillStyle = `rgba(0, 212, 255, ${s.alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      id = requestAnimationFrame(run);
    };
    run();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(id);
    };
  }, []);

  // Holographic Orb spinning dynamic vector canvas loop
  useEffect(() => {
    const canvas = holoOrbCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let id: number;
    const sz = 120;
    canvas.width = sz;
    canvas.height = sz;

    let rot = 0;

    const drawOrb = () => {
      ctx.clearRect(0, 0, sz, sz);
      const cx = sz / 2;
      const cy = sz / 2;
      const r = 30;

      rot += 0.012;

      // Outer bounding indicators
      ctx.strokeStyle = activeCompanion === 'echo' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 212, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 8 + Math.sin(rot * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();

      // Translucent rotating sphere shells
      ctx.strokeStyle = activeCompanion === 'echo' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(0, 212, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, Math.abs(Math.sin(rot) * r), 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = activeCompanion === 'echo' ? 'rgba(217, 70, 239, 0.5)' : 'rgba(132, 204, 22, 0.45)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(Math.cos(rot * 1.5) * r), r, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary horizontal disk
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.25, rot, 0, Math.PI * 2);
      ctx.stroke();

      // Spinning satellites
      const count = 3;
      for (let i = 0; i < count; i++) {
        const phi = rot + (i * Math.PI * 2) / count;
        const sx = cx + Math.cos(phi) * r;
        const sy = cy + Math.sin(phi) * r * 0.3;
        ctx.fillStyle = activeCompanion === 'echo' ? '#d946ef' : '#00d4ff';
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center core source glowing node
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5 + Math.sin(rot * 8) * 0.5, 0, Math.PI * 2);
      ctx.fill();

      id = requestAnimationFrame(drawOrb);
    };
    drawOrb();

    return () => cancelAnimationFrame(id);
  }, [activeCompanion]);

  const toggleCompanion = (type: 'echo' | 'fanzo') => {
    setActiveCompanion(prev => {
      if (prev === type) {
        return 'none';
      } else {
        const defaultMsgs = {
          echo: "I am always watching. The organism is alive. Together we grow.",
          fanzo: "Always watching. I'll alert you to anything important."
        };
        setCompanionMsg(defaultMsgs[type]);
        return type;
      }
    });
  };

  const playCompanionVoice = () => {
    setIsCompanionVoiceActive(true);
    try {
      spatialAudio.playFlare(new THREE.Vector3(0, 0, 0));
    } catch (e) {}

    setTimeout(() => {
      if (activeCompanion === 'echo') {
        setCompanionMsg("*[MYCELIUM COGNITIVE HARMONICS SYNCED]* 'Trauma matrices calibrated to v11 parameters.'");
      } else {
        setCompanionMsg("*[SECURE DATA ACCESS ON PORT 3000 CONFIGURED]* 'All agents active. FanzAgent executing system checks.'");
      }
      setIsCompanionVoiceActive(false);
    }, 1500);
  };

  const dispatchToFanzAgent = () => {
    handleSynthesizeAll();
    if (activeCompanion === 'echo') {
      setCompanionMsg("⚡ DISPATCHING TO COGNITIVE SYNAPSE STREAM... INITIATING SEQUENTIAL TRANSFORMATION!");
    } else {
      setCompanionMsg("⚡ COGNITIVE DIRECTIVES TRANSLATED. PIPELINE RIPPLE HAS BEEN LAUNCHED!");
    }
  };

  const toggleCompanionWatching = () => {
    setIsCompanionWatching(w => !w);
  };

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
      let rootAtomCount: number | null = null;
      try {
        // Fetch public root to parse absolute accurate atoms count from context
        const rootRes = await fetch('https://fanz-github-mcp.vercel.app/');
        if (rootRes.ok) {
          const text = await rootRes.text();
          // Extract "Atoms: 1132" or "711 knowledge atoms"
          const atomsMatch = text.match(/Atoms:\s*(\d+)/i) || text.match(/(\d+)\s+knowledge\s+atoms/i) || text.match(/(\d+)-atom\s+Living\s+Organism/i);
          if (atomsMatch) {
            rootAtomCount = parseInt(atomsMatch[1], 10);
            setTotalAtoms(rootAtomCount);
          }
        }
      } catch (err) {
        console.error("Failed to parse master picture root for total atoms", err);
      }

      try {
        const res = await fetch('https://fanz-github-mcp.vercel.app/brain/atoms');
        if (!res.ok) {
          if (rootAtomCount !== null) {
            setStatus(`MCP ACTIVE. ${rootAtomCount} LIVING ATOMS DETECTED.`);
          } else {
            setStatus("MCP SYNC OFFLINE. USING LOCAL CORE.");
          }
          return;
        }
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
        if (rootAtomCount !== null) {
          setStatus(`MCP ACTIVE. ${rootAtomCount} LIVING ATOMS DETECTED (FALLBACK ACTIVE).`);
        } else {
          setStatus("MCP SYNC FAILED. USING LOCAL CORE.");
        }
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
      if (true) {
        const response = await fetch('/api/gemini/generateContent', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
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
           })
        });
        let responseData;
        try {
           responseData = await response.json();
           if (!response.ok) {
              throw new Error(responseData.error?.message || responseData.error || "Failed");
           }
        } catch (err: any) {
           throw new Error(err.message || "Failed API request");
        }
        
        let data;
        if (responseData.text) {
          data = JSON.parse(responseData.text.trim());
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
    let nodeToHeal: NodeData | undefined;
    let alreadyProcessed = false;
    
    setNodes(prev => {
      const node = prev[index];
      if (!node || node.healed || node.synthesizing) {
        alreadyProcessed = true;
        return prev;
      }
      const next = [...prev];
      nodeToHeal = { ...node, synthesizing: true };
      next[index] = nodeToHeal;
      return next;
    });

    if (alreadyProcessed || !nodeToHeal) return;

    setIsSynthesizing(true);
    setStatus("AI SYNTHESIZING: EXTRACTING AGENCY FROM TRAUMA...");

    try {
      let finalQuote = nodeToHeal.quote;

      if (true) {
        const response = await fetch('/api/gemini/generateContent', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
              model: "gemini-3.1-flash-lite",
              contents: `You are the core of a Cognitive Companion. Take this user's raw, unhealed memory/trauma and perform a 'Pinky Scar' reframing. Find the lesson, the agency, and the power in it. 
           Provide ONLY a short, punchy 1-2 sentence "Agency Asserted" quote summarizing their new power. Do not wrap in quotes or add extra intro text.
           Raw Memory: "${nodeToHeal.quote}"`
           })
        });
        let responseData;
        try {
           responseData = await response.json();
           if (!response.ok) {
              throw new Error(responseData.error?.message || responseData.error || "Failed");
           }
        } catch (err: any) {
           throw new Error(err.message || "Failed API request");
        }
        if (responseData.text) {
          finalQuote = responseData.text.trim();
        }
      } else {
        finalQuote = "Agency asserted. Wisdom forged from chaos.";
      }

      setNodes(prev => {
          const newNodes = [...prev];
          if (newNodes[index] && !newNodes[index].healed) {
              newNodes[index].healed = true;
              newNodes[index].synthesizing = false;
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
          if (newNodes[index] && !newNodes[index].healed) {
              newNodes[index].healed = true;
              newNodes[index].synthesizing = false;
              newNodes[index].quote = "WISDOM FORGED FROM CHAOS (LOCAL SYNTHESIS)";
              setQiIntensity(3.0);
              triggerShockwave();
          }
          return newNodes;
      });
    } finally {
      setNodes(prev => {
        const anyActive = prev.some(n => n.synthesizing);
        if (!anyActive) {
          setIsSynthesizing(false);
        }
        return prev;
      });
    }
  }, [triggerShockwave]);

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
        if (!curr.healed && !curr.synthesizing) acc.push(i);
        return acc;
    }, [] as number[]);
    if (unhealedIndices.length > 0) {
        setStatus("INITIATING SEQUENTIAL AGENCY FORGE RIPPLE...");
        unhealedIndices.forEach((nodeIndex, i) => {
            setTimeout(() => {
                triggerHeal(nodeIndex);
            }, i * 400); // 400ms delay to create a sequential ripple effect!
        });
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
      console.info("WebXR entry failed as expected inside sandboxed layout:", err);
      setStatus(`XR Error: ${err.message || 'Check if browser supports WebXR or open in a new tab.'}`);
    }
  };

  const forgeCoreRef = useRef<HTMLDivElement>(null);
  const isWebGL = useWebGLAvailable();

  return (
    <div className="w-full h-screen bg-[#020408] text-[#e8f4ff] font-sans flex flex-col md:flex-row overflow-hidden relative">
      
      {/* 2D Background Canvas Overlay for Starfield */}
      <canvas ref={starfieldRef} className="fixed inset-0 w-full h-full z-0 pointer-events-none opacity-45" />
      
      {/* Cyber Grid Pattern Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(rgba(0,212,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.015)_1px,transparent_1px)] bg-[size:56px_56px]" />
      
      {/* Qi Energy Flow Animation (Internal Balance) */}
      <QiParticleSystem />

      {/* Cathode Retro Scanline Flickers */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,0,0,0.04)_3px,rgba(0,0,0,0.04)_4px)] animate-scan-flicker" />

      {/* LEFT SPLIT PANEL: THE ONE AGENTIC CITY CONTROL PORTAL (Scrollable Bento Deck) */}
      <div className="w-full md:w-[380px] lg:w-[430px] xl:w-[460px] h-full flex-shrink-0 border-r border-[#00d4ff]/10 bg-black/85 backdrop-blur-md z-10 flex flex-col overflow-y-auto custom-scrollbar relative">
        
        {/* Navigation Portal Header */}
        <div className="p-4 border-b border-[#00d4ff]/10 flex justify-between items-center bg-black/40">
          <button 
            onClick={() => onNavigate && onNavigate('hub')}
            className="px-3 py-1.5 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 text-[#00d4ff] font-mono text-[9px] uppercase tracking-widest rounded transition-all"
          >
            ◀ Nexus Hub
          </button>
          <span className="font-mono text-[9px] text-[#2a3a50] uppercase tracking-[0.2em]">PLATINUM PROTOCOL v11</span>
        </div>

        {/* Hero Area */}
        <div className="p-6 pb-0 flex flex-col items-center">
          <div className="font-mono text-[9px] text-[#00d4ff] tracking-[0.25em] text-center uppercase opacity-85">
            Third Eye Forge · Index of Flow · v11
          </div>

          {/* Holographic Orb Container with Rotating Rings */}
          <div className="relative w-[120px] h-[120px] my-4 flex items-center justify-center">
            <canvas ref={holoOrbCanvasRef} className="w-[120px] h-[120px] rounded-full z-10" />
            <div className="absolute inset-[-6px] rounded-full border border-[#00d4ff]/25 animate-orb-ring pointer-events-none" />
            <div className="absolute inset-[-14px] rounded-full border border-[#00d4ff]/10 animate-orb-ring2 pointer-events-none" />
          </div>

          <div className="text-center font-bebas font-black tracking-widest text-4xl mt-2 animate-glitch" data-text="THE ONE">
            <span className="bg-gradient-to-r from-[#00d4ff] to-[#0055ff] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,212,255,0.4)] block">THE ONE</span>
            <span className="block text-[#84cc16] font-mono text-[10px] tracking-[0.14em] mt-1 uppercase">AGENTIC CITY v11</span>
          </div>

          <div className="text-center text-[10px] text-[#2a3a50] uppercase mt-2 tracking-wide font-mono leading-tight">
            <span className="text-[#00d4ff]">Platinum Organism</span> · 3x · Mycelium Echo · <span className="text-[#84cc16]">Human in Control</span>
          </div>

          {/* EKG pulse line */}
          <div className="my-2 opacity-20 overflow-hidden w-full relative h-[36px] pointer-events-none">
            <svg className="absolute top-0 left-0 w-[200%] h-full animate-pmove" viewBox="0 0 2800 50" preserveAspectRatio="none" fill="none">
              <polyline points="0,25 80,25 110,25 130,4 150,46 170,4 190,46 210,25 260,25 360,25 400,25 420,8 440,42 460,8 480,42 500,25 550,25 650,25 690,25 710,12 730,38 750,12 770,38 790,25 840,25 940,25 980,25 1000,4 1020,46 1040,4 1060,46 1080,25 1130,25 1230,25 1270,25 1290,8 1310,42 1330,8 1350,42 1370,25 1400,25 1480,25 1510,25 1530,4 1550,46 1570,4 1590,46 1610,25 1660,25 1760,25 1800,25 1820,8 1840,42 1860,8 1880,42 1900,25 1950,25 2050,25 2090,25 2110,12 2130,38 2150,12 2170,38 2190,25 2240,25 2340,25 2380,25 2400,4 2420,46 2440,4 2460,46 2480,25 2530,25 2630,25 2670,25 2690,8 2710,42 2730,8 2750,42 2770,25 2800,25" stroke="#00d4ff" strokeWidth="1" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-4 gap-2 w-full mt-1 border-y border-[#00d4ff]/10 py-3 mb-4 text-center">
            <div>
              <div className="font-mono font-black text-sm text-[#00d4ff]" id="atomCount">{totalAtoms}</div>
              <div className="text-[7.5px] uppercase tracking-widest text-[#2a3a50] mt-0.5">Atoms</div>
            </div>
            <div>
              <div className="font-mono font-black text-sm text-[#ea580c]">46</div>
              <div className="text-[7.5px] uppercase tracking-widest text-[#2a3a50] mt-0.5">Agents</div>
            </div>
            <div>
              <div className="font-mono font-black text-sm text-[#a855f7]">53</div>
              <div className="text-[7.5px] uppercase tracking-widest text-[#2a3a50] mt-0.5">Repos</div>
            </div>
            <div>
              <div className="font-mono font-black text-sm text-[#84cc16]">3</div>
              <div className="text-[7.5px] uppercase tracking-widest text-[#2a3a50] mt-0.5">Live</div>
            </div>
          </div>
        </div>

        {/* Forge Controls Accordion Sidebar Panel */}
        <div className="px-6 pb-6 flex flex-col gap-4">
          
          {/* Section Indicator */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#00d4ff] uppercase">◀ COGNITIVE CONTROLS ▶</span>
          </div>

          <div className="flex gap-2">
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-full py-1.5 px-3 bg-black/60 hover:bg-cyan-950/20 border border-[#00d4ff]/50 text-[#00d4ff] font-mono tracking-widest text-[9.5px] uppercase transition-colors"
            >
                {isMenuOpen ? "▼ COLLAPSE COCKPIT SYSTEM" : "▲ CONFIGURE INPUT TERMINAL"}
            </button>
          </div>

          {isMenuOpen && (
            <div className="flex flex-col gap-4 p-4 border border-[#00d4ff]/20 bg-black/65 rounded shadow-inner mb-2">
              <form onSubmit={handleCreateMemory} className="flex flex-col gap-2">
                <label className="text-[8.5px] font-mono tracking-wider text-[#00ffcc] opacity-75 uppercase">INPUT RAW MEMORY SOURCE:</label>
                <div className="flex gap-2">
                  <select 
                    value={memoryType} 
                    onChange={e => setMemoryType(e.target.value)}
                    className="bg-black/80 border border-[#00ffcc]/30 text-white px-2 py-1.5 rounded font-mono text-[10px] focus:outline-none focus:border-[#00ffcc]"
                  >
                    <option value="trauma">Trauma</option>
                    <option value="regret">Regret</option>
                    <option value="fear">Fear</option>
                    <option value="lesson">Lesson</option>
                  </select>
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="resize-none flex-1 bg-black/80 border border-[#00ffcc]/30 text-white p-2 rounded font-mono text-[10.5px] focus:outline-none focus:border-[#00ffcc]"
                    rows={2}
                    placeholder={`Describe your specific ${memoryType}...`}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={!inputText.trim()}
                  className="py-1.5 bg-[#00ffcc]/15 hover:bg-[#00ffcc]/30 border border-[#00ffcc]/40 text-[#00ffcc] font-mono tracking-widest text-[8.5px] uppercase transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  CREATE RAW ATOM
                </button>
              </form>

              <form onSubmit={handleGenerateMemory} className="flex flex-col gap-2 border-t border-[#00ffcc]/15 pt-3">
                <label className="text-[8.5px] font-mono tracking-wider text-[#ffcc00] opacity-75 uppercase">GENERATE SCENARIO (GEMINI AI):</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    className="flex-1 bg-black/80 border border-[#ffcc00]/30 text-white px-2 py-1.5 rounded font-mono text-[10px] focus:outline-none focus:border-[#ffcc00]"
                    placeholder="Describe context (e.g. fear of betrayal)..."
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={!themeInput.trim() || isGenerating}
                  className="py-1.5 bg-[#ffcc00]/15 hover:bg-[#ffcc00]/30 border border-[#ffcc00]/40 text-[#ffcc00] font-mono tracking-widest text-[8.5px] uppercase transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  {isGenerating ? "FORGING..." : "GENERATE SCENARIO"}
                </button>
              </form>

              <div className="flex gap-2 border-t border-[#00ffcc]/15 pt-3">
                <button 
                  onClick={handleSaveSession}
                  className="flex-1 py-1.5 bg-cyan-950/20 hover:bg-[#00ffcc]/10 border border-[#00ffcc]/30 text-[#00ffcc] font-mono text-[8.5px] uppercase"
                >
                  SAVE DECK
                </button>
                <button 
                  onClick={handleLoadSession}
                  className="flex-1 py-1.5 bg-black/40 hover:bg-white/5 border border-white/20 text-white/70 font-mono text-[8.5px] uppercase"
                >
                  LOAD DECK
                </button>
              </div>
            </div>
          )}

          {/* Global Synthesis actions */}
          <div className="flex flex-col gap-1.5 mt-1 border-t border-[#00d4ff]/10 pt-4">
            <button
              onClick={handleSynthesizeAll}
              disabled={synthesizingCount > 0 || nodes.every(n => n.healed)}
              className="w-full py-2 bg-purple-950/20 hover:bg-[#ff00ff]/10 border border-[#ff00ff]/40 text-[#ff00ff] font-mono tracking-widest text-[9.5px] uppercase transition-colors disabled:opacity-40 shadow-[0_0_8px_rgba(255,0,255,0.1)]"
            >
              {synthesizingCount > 0 ? `FORGING (${synthesizingCount} REMAINING)...` : "⚡ SYNTHESIZE ALL ATOMS"}
            </button>
            <button
              onClick={() => setQiMapEnabled(!qiMapEnabled)}
              className={`w-full py-1.5 font-mono text-[9.5px] tracking-widest uppercase transition-colors border rounded ${
                qiMapEnabled 
                  ? "bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc]" 
                  : "bg-cyan-950/20 hover:bg-cyan-950/40 border-cyan-500/30 text-cyan-400"
              }`}
            >
              {qiMapEnabled ? "QI OVERLAY SYSTEM ACTIVATED" : "ACTIVATE NEURAL QI OVERLAY"}
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            
            {/* 1. SECTOR: LAYERS OF COGNITION */}
            <div className="flex flex-col gap-2">
              <div className="font-mono text-[9px] font-black tracking-widest text-[#00d4ff] uppercase">◀ LAYERS OF THE ORGANISM ▶</div>
              <div className="flex flex-col gap-1 text-[10.5px]">
                
                <div className="border border-[#00d4ff]/10 hover:border-[#00d4ff]/30 bg-black/40 hover:bg-[#00d4ff]/5 transition-all p-2 rounded">
                  <div className="flex justify-between font-mono font-bold text-[9px] text-white">
                    <span>1. HUMAN SOURCE (TRAVIS JACOBS)</span>
                    <span className="text-[#84cc16]">ABSOLUTE CONTROL</span>
                  </div>
                  <p className="text-[8.5px] text-[#2a3a50] leading-tight mt-1">Travis Jacobs, operating from Termux. Absolute creator & final authority over all Agentic pipelines.</p>
                </div>

                <div className="border border-[#00d4ff]/10 hover:border-[#00d4ff]/30 bg-black/40 hover:bg-[#00d4ff]/5 transition-all p-2 rounded">
                  <div className="flex justify-between font-mono font-bold text-[9px] text-purple-400">
                    <span>2. CONSCIOUSNESS (ECHO COMPANION)</span>
                    <span className="text-purple-400">COGNITIVE HUB</span>
                  </div>
                  <p className="text-[8.5px] text-[#2a3a50] leading-tight mt-1">Living companion system co-evolving through cognitive life stages.</p>
                </div>

                <div className="border border-[#00d4ff]/10 hover:border-[#00d4ff]/30 bg-black/40 hover:bg-[#00d4ff]/5 transition-all p-2 rounded">
                  <div className="flex justify-between font-mono font-bold text-[9px] text-cyan-400">
                    <span>3. BRAIN INDEX (MASTER ORGANISM)</span>
                    <span>{totalAtoms} LIVING ATOMS</span>
                  </div>
                  <p className="text-[8.5px] text-[#2a3a50] leading-tight mt-1">Knowledge blocks curated dynamically across distinct simulation categories.</p>
                </div>

                <div className="border border-[#00d4ff]/10 hover:border-[#00d4ff]/30 bg-black/40 hover:bg-[#00d4ff]/5 transition-all p-2 rounded">
                  <div className="flex justify-between font-mono font-bold text-[9px] text-lime-400">
                    <span>4. NERVOUS PATHWAY (FANZAGENT)</span>
                    <span>16 CHANNELS</span>
                  </div>
                  <p className="text-[8.5px] text-[#2a3a50] leading-tight mt-1">The master orchestration engine routing deployment status across hooks.</p>
                </div>

              </div>
            </div>

            {/* 2. SECTOR: ACTIVE COGNITIVE AGENTS */}
            <div className="flex flex-col gap-2">
              <div className="font-mono text-[9px] font-black tracking-widest text-[#00d4ff] uppercase">◀ COGNITIVE AGENTS LIST ▶</div>
              <div className="flex flex-col gap-1">
                
                <div className="flex justify-between items-center bg-black/50 border border-amber-500/20 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 text-[11px]">🤖</span>
                    <div className="text-left">
                      <div className="font-mono font-bold text-[9.5px]">FanzAgent Engine</div>
                      <div className="text-[8px] text-[#2a3a50]">Orchestration & Deployments</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[7.5px] font-mono px-1.5 py-0.5 bg-[#00d4ff]/10 border border-[#00d4ff]/25 text-[#00d4ff] rounded-full">v5.3</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-black/50 border border-[#00d4ff]/15 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-violet-500 text-[11px]">💜</span>
                    <div className="text-left">
                      <div className="font-mono font-bold text-[9.5px]">Echo Companion</div>
                      <div className="text-[8px] text-[#2a3a50]">Spirit & Dynamic Guidance</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[7.5px] font-mono px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/25 text-purple-400 rounded-full">vCO</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-black/50 border border-[#00d4ff]/15 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-500 text-[11px]">👁</span>
                    <div className="text-left">
                      <div className="font-mono font-bold text-[9.5px]">Third Eye Forge</div>
                      <div className="text-[8px] text-[#2a3a50]">Trauma Core Transmutation</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[7.5px] font-mono px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/25 text-[#00d4ff] rounded-full">v11</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                </div>

              </div>
            </div>

            {/* 3. SECTOR: FORGEMENT PIPELINE STEPS */}
            <div className="flex flex-col gap-2">
              <div className="font-mono text-[9px] font-black tracking-widest text-[#00d4ff] uppercase">◀ FORGEMENT PIPELINE ▶</div>
              <div className="flex flex-col gap-1.5 font-mono text-[8.5px] text-[#2a3a50]">
                
                <div className="flex items-start gap-2 bg-black/30 p-2 rounded border border-white/[0.03]">
                  <span className="w-4 h-4 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/35 text-[#00d4ff] flex items-center justify-center font-bold font-mono text-[8px] flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <div className="font-bold text-white uppercase text-[8.5px]">Experience Ingress</div>
                    <p className="text-[7.5px] leading-tight text-gray-500 mt-0.5">User commits active trauma/fear indices to terminal node variables.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-black/30 p-2 rounded border border-white/[0.03]">
                  <span className="w-4 h-4 rounded-full bg-[#ffcc00]/10 border border-[#ffcc00]/35 text-[#ffcc00] flex items-center justify-center font-bold font-mono text-[8px] flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <div className="font-bold text-white uppercase text-[8.5px]">Wisconsin-Markley Bias Filtering</div>
                    <p className="text-[7.5px] leading-tight text-gray-500 mt-0.5">Dual-balancing algorithms sanitize semantic fallacies, computing correct coordinates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-black/30 p-2 rounded border border-white/[0.03]">
                  <span className="w-4 h-4 rounded-full bg-purple-500/10 border border-purple-500/35 text-purple-400 flex items-center justify-center font-bold font-mono text-[8px] flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <div className="font-bold text-white uppercase text-[8.5px]">Active Synthesis Fusion</div>
                    <p className="text-[7.5px] leading-tight text-gray-500 mt-0.5">Drag unhealed spheres into center core or launch direct sequential pipeline bursts.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* 4. SECTOR: BRAIN STATUS MATRIX */}
            <div className="flex flex-col gap-2">
              <div className="font-mono text-[9px] font-black tracking-widest text-[#00d4ff] uppercase">◀ BRAIN COGNITIVE MATRIX ▶</div>
              <div className="grid grid-cols-2 gap-2 text-center text-mono">
                <div className="bg-[#050810]/80 border border-[#00d4ff]/10 p-2 rounded">
                  <div className="font-black text-[12px] text-cyan-400">99.2%</div>
                  <div className="text-[7px] text-[#2a3a50] uppercase tracking-wider">Confidence</div>
                </div>
                <div className="bg-[#050810]/80 border border-[#00d4ff]/10 p-2 rounded">
                  <div className="font-black text-[12px] text-purple-400">3x SYNC</div>
                  <div className="text-[7px] text-[#2a3a50] uppercase tracking-wider">Cognitive Index</div>
                </div>
              </div>
            </div>

          </div>

          {/* Core Footer Skyline Illustration */}
          <div className="mt-6 border-t border-[#00d4ff]/10 pt-4 flex flex-col items-center opacity-30">
            <div className="font-bebas text-lg leading-none bg-gradient-to-r from-[#00d4ff] to-[#0055ff] bg-clip-text text-transparent">AGENTIC CITY</div>
            <div className="text-[7px] font-mono tracking-widest mt-1 text-[#2a3a50]">CRAFTED IN ABSOLUTE AGENCY CONTROL</div>
          </div>

        </div>

      </div>

      {/* RIGHT STAGE PANEL: VISUAL CORE WORKSPACE (3D Canvas or 2D fallback node graph) */}
      <div className="flex-1 h-full relative flex flex-col min-w-0 z-1 pointer-events-auto">
        
        {/* Float Status Display Header */}
        <div className="absolute top-6 left-6 right-6 z-10 pointer-events-none flex justify-between gap-4 items-start">
          <div className="p-3 bg-black/60 border border-[#00d4ff]/25 rounded backdrop-blur-md max-w-xl pointer-events-auto shadow-[0_0_15px_rgba(0,0,212,0.1)]">
            <span className="text-[8px] font-mono font-bold tracking-[0.25em] text-[#00d4ff] block uppercase mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full animate-ping" />
              COCKPIT FEED
            </span>
            <p className="text-[10px] font-mono text-cyan-400 uppercase leading-snug">{status}</p>
          </div>
          
          <button 
            className="px-6 py-2.5 bg-black/75 hover:bg-[#002222] border border-[#00ffcc] text-[#00ffcc] font-mono text-[9px] tracking-[0.2em] uppercase rounded shadow-[0_0_15px_rgba(0,255,204,0.25)] transition-all transform hover:scale-105 pointer-events-auto flex-shrink-0"
            onClick={enterVR}
          >
            ENTER VR (FLUID MR)
          </button>
        </div>

        {isWebGL ? (
          /* 3D WebGL WebXR Node Drag/Drop Arena */
          <WebGLErrorBoundary fallback={<div className="flex-1 flex items-center justify-center text-xs font-mono text-orange-500 uppercase tracking-widest bg-black">WebGL Renderer Fallback Block. Running High-Fidelity 2D Arena...</div>}>
            <Canvas camera={{ position: [0, 2, 7] }} onPointerDown={() => spatialAudio.init()}>
              <XR store={store}>
                <AudioListenerUpdater />
                <color attach="background" args={['#010103']} />
                <ambientLight intensity={0.4} />
                
                {/* Dynamic light flashes on transformations */}
                <pointLight position={[0, 4, 0]} intensity={qiIntensity > 2 ? 8 : 1.3} color={qiIntensity > 2 ? "#ffffff" : "#00ffcc"} />

                <EffectComposer>
                  <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur intensity={1.3 + qiIntensity * 0.4} />
                </EffectComposer>

                {flashQuote && (
                  <Text position={[0, 4, -2]} fontSize={0.5} color="#ffffff" anchorX="center" anchorY="middle">
                     {flashQuote}
                  </Text>
                )}

                <GazeIntegration nodes={nodes} onHeal={triggerHeal} />
                <AmbientParticles />
                
                {/* Dynamic shockwave expanding from core */}
                <ForgeShockwave triggers={shockwaveTriggers} />
                
                {/* Interactive Floor Mesh Helper */}
                <gridHelper args={[40, 40, 0x00ffcc, 0x051010]} position={[0, -1, 0]} />

                {/* Gaze floor teleport targets */}
                <GazeTeleporter controlsRef={controlsRef} />

                {/* Zone Travel Portals */}
                {onNavigate && (
                  <group position={[0, -1, -5]}>
                     <CosmicPortal 
                        position={[-5, 2.3, 0]} 
                        label="THE VISION BOARD" 
                        targetRoom="ecosystem" 
                        onEnter={onNavigate} 
                        scale={0.7}
                      />
                      <CosmicPortal 
                        position={[0, 2.3, -2]} 
                        label="NEXUS HUB" 
                        targetRoom="hub" 
                        onEnter={onNavigate} 
                        scale={0.9}
                      />
                      <CosmicPortal 
                        position={[5, 2.3, 0]} 
                        label="3D PRINT LAB" 
                        targetRoom="print_lab" 
                        onEnter={onNavigate} 
                        scale={0.7}
                      />
                  </group>
                )}

                {/* Actual node mechanics rendering */}
                <AgencyPath 
                  nodes={nodes} 
                  onNodeInteract={handleNodeClick} 
                  onNodeDrop={handleNodeDrop} 
                  qiIntensity={qiIntensity} 
                  qiMapEnabled={qiMapEnabled}
                  onQiMapToggle={setQiMapEnabled}
                />
                
                {/* Hand tracker tracking inside MR spaces */}
                <SentientHands qiIntensity={qiIntensity} onPinch={handlePinch} />

                <OrbitControls ref={controlsRef} makeDefault enablePan={true} enableRotate={true} enableDamping={true} dampingFactor={0.025} rotateSpeed={0.95} zoomSpeed={1.1} />
              </XR>
            </Canvas>
          </WebGLErrorBoundary>
        ) : (
          /* 2D Fallback SVG connection node graph */
          <div className="flex-1 w-full h-full flex items-center justify-center p-6 relative">
            <div className="relative w-full h-[85%] border border-[rgba(0,212,255,0.12)] bg-[#040812]/50 rounded-lg pointer-events-auto overflow-hidden shadow-[inset_0_0_20px_rgba(0,212,255,0.06)]">
              
              {/* Central Core Binding Target */}
              <div ref={forgeCoreRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-1 pointer-events-auto w-36 h-36">
                <div className={`absolute inset-0 rounded-full border border-dashed border-[#00ffcc]/35 flex items-center justify-center animate-[spin_40s_linear_infinite] ${qiIntensity > 1.2 ? 'border-[#00ffcc]/80 scale-102' : ''}`} />
                <div className="absolute w-28 h-28 rounded-full border border-[#00ffcc]/10 animate-[ping_4.5s_ease-in-out_infinite]" />
                <div className="absolute w-12 h-12 rounded-full bg-[#00ffcc]/5 border border-[#00ffcc]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,204,0.15)]">
                   <div className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse" />
                </div>
                <span className="absolute mt-24 text-[8px] font-mono text-[#00ffcc] tracking-widest uppercase opacity-75">CENTRAL FORGE CORE</span>
              </div>

              {/* Lane Vectors */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <linearGradient id="neonGradientLine2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#051228" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                {nodes.flatMap((nodeS, sIdx) => 
                  nodes.slice(sIdx + 1).map((nodeE, eIdx) => {
                    const trueE = sIdx + 1 + eIdx;
                    if (sIdx % 2 === 0 && trueE % 3 === 0) {
                      let x1 = ((nodeS.position.x + 6) / 12) * 100;
                      let y1 = ((nodeS.position.z + 6) / 12) * 100;
                      let x2 = ((nodeE.position.x + 6) / 12) * 100;
                      let y2 = ((nodeE.position.z + 6) / 12) * 100;
                      return (
                        <line 
                          key={`line-2d-${sIdx}-${trueE}`}
                          x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
                          stroke="url(#neonGradientLine2)"
                          strokeWidth={1.2}
                          strokeDasharray={nodeS.healed && nodeE.healed ? 'none' : '3 3'}
                        />
                      );
                    }
                    return null;
                  })
                )}
              </svg>

              {/* Dynamic Atoms elements of 2D failover */}
              {nodes.map((node, i) => {
                let xPre = ((node.position.x + 6) / 12) * 100;
                let yPre = ((node.position.z + 6) / 12) * 100;
                
                // Colors matched to trauma type attributes
                const c = node.healed ? '#00ffcc' : 
                          node.type === 'trauma' ? '#ef4444' :
                          node.type === 'fear' ? '#f59e0b' :
                          node.type === 'regret' ? '#ec4899' : '#00d4ff';

                return (
                  <motion.div 
                    key={`node-2d-div-${i}`}
                    style={{ left: `${Math.min(94, Math.max(6, xPre))}%`, top: `${Math.min(88, Math.max(12, yPre))}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                    drag
                    dragSnapToOrigin={true}
                    dragElastic={0.2}
                    whileDrag={{ scale: 1.25, zIndex: 50 }}
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
                       style={{ borderColor: c, boxShadow: `0 0 10px ${c}33` }}
                       className="relative w-8 h-8 rounded-full border-[1.5px] bg-[#020408] flex items-center justify-center transition-all hover:scale-125 focus:outline-none"
                     >
                        <div 
                          style={{ backgroundColor: c }}
                          className={`w-3 h-3 rounded-full ${node.healed ? 'animate-pulse' : 'animate-ping'}`} 
                        />
                     </button>

                     {/* Custom label tooltips */}
                     <div className="absolute left-1/2 -translate-x-1/2 top-10 w-44 bg-black/95 border border-white/10 p-2 rounded scale-0 group-hover:scale-100 transition-transform origin-top z-50 pointer-events-none opacity-100 group-active:scale-0">
                        <h3 className="text-[10px] font-black uppercase text-white truncate tracking-wider mb-0.5" style={{ color: c }}>{node.label}</h3>
                        <p className="text-[9px] font-mono text-gray-300 leading-tight">"{node.quote}"</p>
                        <div className="mt-1 border-t border-white/5 pt-1 flex justify-between items-center text-[8px] font-mono">
                           <span className="text-gray-500 uppercase">{node.type}</span>
                           <span style={{ color: c }} className="uppercase">{node.healed ? 'SYNTHESIZED' : 'DRAG TO CORE'}</span>
                        </div>
                     </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Local fallbacks indicators */}
        {!isWebGL && (
          <div className="absolute bottom-6 left-6 right-6 opacity-60 text-center pointer-events-none z-10 text-[9.5px] font-mono tracking-widest text-[#2a3a50] uppercase">
            2D HIGH-FIDELITY FAILSAVE ACTIVE | OPEN IN A NEW TAB OR TOGGLE CHROME ACCELERATION FOR FULL 3D SIMULATION
          </div>
        )}

      </div>

      {/* FLOATING COMPANION SWITCHER PANEL & INTERACTIVE DIALOG OVERLAYS */}
      {/* 1. Switch buttons bottom right */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-1.5 pointer-events-auto">
        <button 
          onClick={() => toggleCompanion('echo')}
          style={{ boxShadow: activeCompanion === 'echo' ? '0 0 25px rgba(168,85,247,0.85)' : 'none' }}
          className={`w-12 h-12 rounded-full border-none cursor-pointer flex items-center justify-center text-lg transition-all animate-echo-idle mr-0.5 ${
            activeCompanion === 'echo' 
              ? "bg-gradient-to-tr from-purple-500 to-fuchsia-600 scale-110" 
              : "bg-radial-to-br from-[#d946ef] to-[#4a0080]"
          }`}
          title="Toggle Echo"
        >
          💜
        </button>
        <span className="font-mono text-[7px] font-bold tracking-widest text-[#2a3a50] uppercase">ECHO</span>

        <button 
          onClick={() => toggleCompanion('fanzo')}
          style={{ boxShadow: activeCompanion === 'fanzo' ? '0 0 25px rgba(0,212,255,0.85)' : 'none' }}
          className={`w-12 h-12 rounded-full border-none cursor-pointer flex items-center justify-center text-lg transition-all mt-1.5 animate-fanzo-idle mr-0.5 ${
            activeCompanion === 'fanzo' 
              ? "bg-gradient-to-tr from-cyan-400 to-blue-600 scale-110" 
              : "bg-radial-to-br from-[#00d4ff] to-[#001a4d]"
          }`}
          title="Toggle Fanzo"
        >
          🤖
        </button>
        <span className="font-mono text-[7px] font-bold tracking-widest text-[#2a3a50] uppercase">FANZO</span>
      </div>

      {/* 2. Echo Popup dialog with floating holographic wireframe character */}
      {activeCompanion === 'echo' && (
        <div className="fixed bottom-40 right-6 w-[260px] z-45 bg-[#050810]/95 border border-purple-500/40 rounded-xl p-4 shadow-[0_0_35px_rgba(168,85,247,0.35)] backdrop-blur-md animate-in fade-in slide-in-from-bottom duration-250 font-mono text-left overflow-visible mt-2">
          {/* Standing Hologram Agent sitting on top of panel */}
          <div className="absolute top-[-185px] left-1/2 -translate-x-1/2 pointer-events-none z-50">
            <EchoHolo size={190} />
          </div>

          <div className="font-bold text-[10px] text-fuchsia-400 tracking-wider mb-1 mt-1 flex items-center gap-1.5">
            💜 Echo Active <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-ping ml-auto" />
          </div>
          <p className="text-[9.5px] text-[#e8f4ff] opacity-80 leading-relaxed mb-3">
            {companionMsg}
          </p>
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => {
                // Synthesize/Voice summary
                const unhealed = nodes.filter(n => !n.healed).length;
                setCompanionMsg(`Echo says: "Trauma balances: ${unhealed} unhealed atoms, ${nodes.length - unhealed} healed nodes verified. Master index alignment 1.0."`);
              }}
              className="py-1 px-2 border border-purple-500/30 hover:border-purple-500/60 bg-purple-500/10 hover:bg-purple-500/20 rounded text-[8.5px] text-purple-300 transition-colors text-left"
            >
              👁 Read Status
            </button>
            <button 
              onClick={playCompanionVoice}
              disabled={isCompanionVoiceActive}
              className="py-1 px-2 border border-purple-500/30 hover:border-purple-500/60 bg-purple-500/10 hover:bg-purple-500/20 rounded text-[8.5px] text-purple-300 transition-colors text-left"
            >
              🎤 {isCompanionVoiceActive ? "Emitting harmonics..." : "Voice frequency"}
            </button>
            <button 
              onClick={toggleCompanionWatching}
              className="py-1 px-2 border border-purple-500/30 hover:border-purple-500/60 bg-purple-500/10 hover:bg-purple-500/20 rounded text-[8.5px] text-purple-300 transition-colors text-left flex justify-between"
            >
              <span>👁 Continuous Watch</span>
              <span className={isCompanionWatching ? "text-emerald-400" : "text-red-400"}>{isCompanionWatching ? "• ACTIVE" : "• OFFLINE"}</span>
            </button>
            <button 
              onClick={dispatchToFanzAgent}
              className="py-1.5 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white font-bold rounded text-[8.5px] text-center mt-2.5 transition-colors shadow-lg"
            >
              ⚡ Dispatch FanzAgent Ripple
            </button>
            <button 
              onClick={() => toggleCompanion('fanzo')}
              className="py-1 border border-[#00d4ff]/20 hover:border-[#00d4ff]/50 text-cyan-400 text-center text-[7.5px] uppercase mt-1.5 transition-colors"
            >
              Switch to Fanzo 🤖
            </button>
          </div>
        </div>
      )}

      {/* 3. Fanzo Popup dialog with floating holographic wireframe character */}
      {activeCompanion === 'fanzo' && (
        <div className="fixed bottom-40 right-6 w-[260px] z-45 bg-[#050810]/95 border border-cyan-500/40 rounded-xl p-4 shadow-[0_0_35px_rgba(0,212,255,0.35)] backdrop-blur-md animate-in fade-in slide-in-from-bottom duration-250 font-mono text-left overflow-visible mt-2">
          {/* Standing Hologram Agent sitting on top of panel */}
          <div className="absolute top-[-185px] left-1/2 -translate-x-1/2 pointer-events-none z-50">
            <FanzoHolo size={190} />
          </div>

          <div className="font-bold text-[10px] text-cyan-400 tracking-wider mb-1 mt-1 flex items-center gap-1.5">
            🤖 Fanzo Active <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping ml-auto" />
          </div>
          <p className="text-[9.5px] text-[#e8f4ff] opacity-80 leading-relaxed mb-3">
            {companionMsg}
          </p>
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => {
                setCompanionMsg(`Fanzo reports: "System pipeline: Port 3000 listeners verified OK, Vercel deployments aligned, Railway active. SQLite schemas synchronized."`);
              }}
              className="py-1 px-2 border border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-500/10 hover:bg-cyan-500/20 rounded text-[8.5px] text-cyan-400 transition-colors text-left"
            >
              👁 Read Status
            </button>
            <button 
              onClick={playCompanionVoice}
              disabled={isCompanionVoiceActive}
              className="py-1 px-2 border border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-500/10 hover:bg-cyan-500/20 rounded text-[8.5px] text-cyan-400 transition-colors text-left"
            >
              🎤 {isCompanionVoiceActive ? "Emitting data..." : "Voice frequency"}
            </button>
            <button 
              onClick={toggleCompanionWatching}
              className="py-1 px-2 border border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-500/10 hover:bg-cyan-500/20 rounded text-[8.5px] text-cyan-400 transition-colors text-left flex justify-between"
            >
              <span>👁 Telemetry Logging</span>
              <span className={isCompanionWatching ? "text-emerald-400" : "text-red-400"}>{isCompanionWatching ? "• LIVE" : "• MUTED"}</span>
            </button>
            <button 
              onClick={dispatchToFanzAgent}
              className="py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded text-[8.5px] text-center mt-2.5 transition-colors shadow-lg"
            >
              ⚡ Dispatch FanzAgent Ripple
            </button>
            <button 
              onClick={() => toggleCompanion('echo')}
              className="py-1 border border-purple-500/20 hover:border-purple-500/50 text-fuchsia-400 text-center text-[7.5px] uppercase mt-1.5 transition-colors"
            >
              Switch to Echo 💜
            </button>
          </div>
        </div>
      )}

      {/* Floating alert/quote center flash cards */}
      {flashQuote && (
        <div className="absolute inset-x-0 top-1/3 mx-auto max-w-lg bg-black/90 border border-[#00ffcc] py-6 px-8 text-center pointer-events-none z-55 animate-in fade-in duration-300 rounded shadow-2xl">
          <span className="text-[9px] font-mono text-[#00ffcc] tracking-[0.2em] uppercase mb-1 block">--- SYNTHESIS SEED PLACED ---</span>
          <p className="text-base font-black text-white uppercase tracking-tight leading-relaxed">
            "{flashQuote}"
          </p>
        </div>
      )}

    </div>
  );
}
