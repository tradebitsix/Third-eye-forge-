import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import AgencyPath, { NodeData } from './AgencyPath';
import SentientHands from './SentientHands';

const INITIAL_NODES: NodeData[] = [
  { position: new THREE.Vector3(-4, 0, -2), label: "Escape Loop (Shed)", type: 'escape', quote: "These things don't do me — I do these things.", healed: false },
  { position: new THREE.Vector3(0, 1.5, -4), label: "Roof Edge Reflex", type: 'roof', quote: "Fearless flow. Calculate. Tuck. Roll.", healed: false },
  { position: new THREE.Vector3(4, 1.0, -3), label: "Uncle's 75 Stitches", type: 'trauma', quote: "Trauma to Memory. Mind stays strong and clear.", healed: false },
  { position: new THREE.Vector3(7, 0, -2), label: "Single-Dad Rebuild", type: 'rebuild', quote: "Pressure Builds Diamonds.", healed: false }
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
  const [status, setStatus] = useState("Everything is living. Everything flows.");
  const [flashQuote, setFlashQuote] = useState<string | null>(null);

  const triggerHeal = useCallback((index: number) => {
    setNodes(prev => {
        const newNodes = [...prev];
        if (!newNodes[index].healed) {
            newNodes[index].healed = true;
            setQiIntensity(4.0); // MASSIVE flare up energy for visual flash
            setStatus(`SYSTEM: AGENCY ASSERTED: '${newNodes[index].quote.toUpperCase()}'`);
            setFlashQuote(newNodes[index].quote.toUpperCase());
            setTimeout(() => setFlashQuote(null), 4000);
        }
        return newNodes;
    });
  }, []);

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
