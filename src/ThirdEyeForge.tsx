import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import * as THREE from 'three';

import AgencyPath, { NodeData } from './AgencyPath';
import SentientHands from './SentientHands';

const INITIAL_NODES: NodeData[] = [
  { position: new THREE.Vector3(-4, 0, -2), label: "Escape Loop (Shed)", type: 'escape', quote: "These things don't do me — I do these things.", healed: false },
  { position: new THREE.Vector3(0, 1.5, -4), label: "Roof Edge Reflex", type: 'roof', quote: "Fearless flow. Calculate. Tuck. Roll.", healed: false },
  { position: new THREE.Vector3(4, 0, -2), label: "Single-Dad Rebuild", type: 'rebuild', quote: "Pressure Builds Diamonds.", healed: false }
];

const store = createXRStore({
  hand: true, // enables generic-hand
});

export default function ThirdEyeForge() {
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [qiIntensity, setQiIntensity] = useState(0.5);
  const [status, setStatus] = useState("Everything is living. Everything flows.");

  const handlePinch = (pos: THREE.Vector3) => {
    // Find nearest node to heal when user pinches
    const threshold = 2.0;
    const newNodes = [...nodes];
    let healedAny = false;
    
    for (let i = 0; i < newNodes.length; i++) {
      if (!newNodes[i].healed && pos.distanceTo(newNodes[i].position) < threshold) {
        newNodes[i].healed = true;
        healedAny = true;
        break;
      }
    }
    
    if (healedAny) {
      setNodes(newNodes);
      setQiIntensity(2.0); // Flare up energy
      setStatus("SYSTEM: AGENCY ASSERTED: 'THESE THINGS DON'T DO ME — I DO THESE THINGS'");
    }
  };

  const handleNodeClick = (index: number) => {
    const newNodes = [...nodes];
    if (!newNodes[index].healed) {
      newNodes[index].healed = true;
      setNodes(newNodes);
      setQiIntensity(2.0);
      setStatus(`SYSTEM: AGENCY ASSERTED: '${newNodes[index].quote.toUpperCase()}'`);
    }
  };

  // Decay Qi Intensity like water settling back to baseline
  useEffect(() => {
    const interval = setInterval(() => {
      setQiIntensity(prev => Math.max(0.5, prev - 0.05));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const enterVR = () => {
    setStatus("Initiating WebXR Session...");
    store.enterVR();
  };

  return (
    <div className="w-full h-screen bg-[#020204] text-white flex flex-col font-sans overflow-hidden">
      
      {/* Cyber-Organic HUD */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-[#00ffcc] drop-shadow-[0_0_8px_rgba(0,255,204,0.8)]">
            THIRD EYE FORGE
          </h1>
          <h2 className="text-sm font-mono text-[#00ffcc] mt-1 opacity-80 tracking-[0.25em]">
            LIVING ORGANISM CORE | 711+ ATOMS
          </h2>
          <div className="mt-4 p-3 bg-black/40 border border-cyan-500/30 rounded backdrop-blur-sm max-w-lg shadow-lg shadow-[#00ffcc]/10">
            <p className="text-xs font-mono text-[#00ffcc] opacity-90 uppercase leading-snug">{status}</p>
          </div>
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
          <color attach="background" args={['#020204']} />
          <ambientLight intensity={0.2} />
          <pointLight position={[0, 5, 0]} intensity={1.5} color="#00ffcc" />
          
          {/* Subtle Cyber Grid Floor */}
          <gridHelper args={[30, 30, 0x00ffcc, 0x002222]} position={[0, -1, 0]} />

          {/* Agency Path with Knot Insertion / Healing mechanics */}
          <AgencyPath nodes={nodes} onNodeInteract={handleNodeClick} qiIntensity={qiIntensity} />
          
          {/* Triple-Blend Sentient Hands using WebXR (fallback enabled), FABRIK, Qi Sway, Markley Averaging */}
          <SentientHands qiIntensity={qiIntensity} onPinch={handlePinch} />

          <OrbitControls enablePan={true} enableRotate={true} />
          <Environment preset="night" />
        </XR>
      </Canvas>
    </div>
  );
}
