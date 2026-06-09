import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import CosmicPortal from '../components/CosmicPortal';
import CitySkyline from '../components/CitySkyline';
import GuardianSwarm, { FanzAgentGuardian } from '../components/FanzAgentGuardian';
import LogScreens, { TermuxBillboard } from '../components/TermuxBillboard';
import { FlowerOfLifeNode, MysticalTorusKnot } from '../components/SacredGeometry';

interface NexusHub3DProps {
  onNavigate: (room: string) => void;
}

// Interactive floating gold quantum nodes rising from core
function QuantumFruit() {
  const meshRef = useRef<THREE.Mesh>(null);
  const offset = useRef(Math.random() * Math.PI * 2);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = 1.0 + Math.sin(t * 1.2 + offset.current) * 0.4;
      meshRef.current.position.x = Math.sin(t * 0.5 + offset.current) * 0.6;
      meshRef.current.position.z = Math.cos(t * 0.5 + offset.current) * 0.6;
      meshRef.current.rotation.x = t * 1.5;
      meshRef.current.rotation.y = t * 1.2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[0.1]} />
      <meshStandardMaterial emissive="#eab308" color="#ffffff" roughness={0.1} metalness={0.9} />
    </mesh>
  );
}

// Glowing high-fidelity cosmic dust particle flow flowing through the hub
function CosmicDustParticleFlow() {
  const count = 300;
  const pointsRef = useRef<THREE.Points>(null!);
  
  const [positions, speeds, phases, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sp = new Float32Array(count);
    const ph = new Float32Array(count);
    const cols = new Float32Array(count * 3);
    
    const colorList = [
      new THREE.Color('#eab308'), // Warm Gold
      new THREE.Color('#00ffcc'), // Luminous Cyan
      new THREE.Color('#a855f7'), // Sacred Purple
      new THREE.Color('#38bdf8'), // Sky Blue
      new THREE.Color('#ffffff'), // Pure White
    ];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.0 + Math.random() * 15.0;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.random() * 16 - 6; // Y height distribution
      pos[i * 3 + 2] = Math.sin(angle) * radius;
      
      sp[i] = 0.12 + Math.random() * 0.38;
      ph[i] = Math.random() * Math.PI * 2;
      
      const chosenColor = colorList[Math.floor(Math.random() * colorList.length)];
      cols[i * 3] = chosenColor.r;
      cols[i * 3 + 1] = chosenColor.g;
      cols[i * 3 + 2] = chosenColor.b;
    }
    return [pos, sp, ph, cols];
  }, []);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const positionsArray = posAttr.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      // Flow upwards
      positionsArray[i * 3 + 1] += speeds[i] * 0.04;
      // Soft swirling motion
      positionsArray[i * 3] += Math.sin(t * 0.5 + phases[i]) * 0.012;
      positionsArray[i * 3 + 2] += Math.cos(t * 0.5 + phases[i]) * 0.012;
      
      // Recycle particle at the bottom
      if (positionsArray[i * 3 + 1] > 15) {
        positionsArray[i * 3 + 1] = -5;
        const angle = Math.random() * Math.PI * 2;
        const radius = 3.0 + Math.random() * 12.0;
        positionsArray[i * 3] = Math.cos(angle) * radius;
        positionsArray[i * 3 + 2] = Math.sin(angle) * radius;
      }
    }
    posAttr.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.16} 
        vertexColors 
        transparent 
        opacity={0.85} 
        sizeAttenuation 
        depthWrite={false} 
        toneMapped={false} 
      />
    </points>
  );
}

// Soft rotating wireframe protective sacred geometry dome enclosing the hub
function SacredDome() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.025;
    meshRef.current.rotation.x = Math.sin(t * 0.01) * 0.04;
  });
  return (
    <mesh ref={meshRef} position={[0, 4, 0]}>
      <sphereGeometry args={[26, 28, 20]} />
      <meshBasicMaterial 
        color="#c084fc" 
        wireframe 
        transparent 
        opacity={0.06} 
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// Global scene content for dual-rendering in SBS mode
interface NexusSceneContentProps {
  handlePortalEnter: (room: string) => void;
}

function NexusSceneContent({ handlePortalEnter }: NexusSceneContentProps) {
  return (
    <>
      <ambientLight intensity={0.8} />
      
      <directionalLight position={[0, 15, 0]} intensity={1.5} color="#d8b4fe" />
      <pointLight position={[0, -2, 0]} intensity={2.5} color="#00ffcc" />
      <pointLight position={[0, 8, 0]} intensity={2.0} color="#f59e0b" />
      
      <spotLight position={[-10, 8, -10]} intensity={4.5} angle={0.8} penumbra={1} color="#eab308" />
      <spotLight position={[10, 8, 10]} intensity={4.5} angle={0.8} penumbra={1} color="#00ffcc" />
      <spotLight position={[0, 12, -12]} intensity={4.0} angle={0.9} penumbra={1} color="#da46ef" />
      
      <Stars radius={110} depth={40} count={6000} factor={7} saturation={0.8} fade speed={1.8} />

      <group position={[0, -1, 0]}>
        <SacredDome />
        <CosmicDustParticleFlow />

        <CosmicPortal 
          position={[0, 2.0, -8]} 
          label="THIRD EYE FORGE" 
          targetRoom="forge" 
          onEnter={handlePortalEnter} 
          scale={1.15}
          themeColor="#eab308"
        />
        <group position={[0, 5.0, -8]}>
          <FlowerOfLifeNode position={[0, 0, 0]} color="#eab308" scale={0.7} />
        </group>
        <FanzAgentGuardian 
          basePosition={[-1.6, 2.2, -7.5]} 
          color="#eab308" 
          speed={0.95} 
          hoverRadius={1.2} 
        />

        <CosmicPortal 
          position={[6.93, 2.0, -4]} 
          label="VISUAL WAREHOUSE" 
          targetRoom="ecosystem" 
          onEnter={handlePortalEnter} 
          scale={1.15}
          themeColor="#ff2e93"
        />
        <group position={[6.93, 5.0, -4]}>
          <MysticalTorusKnot position={[0, 0, 0]} color="#ff2e93" />
        </group>
        <FanzAgentGuardian 
          basePosition={[5.8, 1.8, -4.8]} 
          color="#ff2e93" 
          speed={0.8} 
          hoverRadius={1.0} 
        />

        <CosmicPortal 
          position={[6.93, 2.0, 4]} 
          label="MARKETPLACE PLAZA" 
          targetRoom="marketplace" 
          onEnter={handlePortalEnter} 
          scale={1.15}
          themeColor="#a855f7"
        />
        <group position={[6.93, 5.0, 4]}>
          <FlowerOfLifeNode position={[0, 0, 0]} color="#a855f7" scale={0.6} />
        </group>
        <FanzAgentGuardian 
          basePosition={[5.8, 2.2, 4.8]} 
          color="#a855f7" 
          speed={1.1} 
          hoverRadius={1.1} 
        />

        <CosmicPortal 
          position={[0, 2.0, 8]} 
          label="3D PRINT LAB" 
          targetRoom="print_lab" 
          onEnter={handlePortalEnter} 
          scale={1.15}
          themeColor="#00ffcc"
        />
        <group position={[0, 5.0, 8]}>
          <MysticalTorusKnot position={[0, 0, 0]} color="#00ffcc" />
        </group>
        <FanzAgentGuardian 
          basePosition={[1.7, 1.9, 7.3]} 
          color="#00ffcc" 
          speed={1.2} 
          hoverRadius={1.3} 
        />

        <CosmicPortal 
          position={[-6.93, 2.0, 4]} 
          label="STUDENT STUDIO" 
          targetRoom="sandbox" 
          onEnter={handlePortalEnter} 
          scale={1.15}
          themeColor="#3b82f6"
        />
        <group position={[-6.93, 5.0, 4]}>
          <FlowerOfLifeNode position={[0, 0, 0]} color="#3b82f6" scale={0.6} />
        </group>
        <FanzAgentGuardian 
          basePosition={[-5.8, 1.8, 4.8]} 
          color="#3b82f6" 
          speed={0.7} 
          hoverRadius={0.9} 
        />

        <CosmicPortal 
          position={[-6.93, 2.0, -4]} 
          label="COMMAND TOWER" 
          targetRoom="construction_sim" 
          onEnter={handlePortalEnter} 
          scale={1.15}
          themeColor="#f43f5e"
        />
        <group position={[-6.93, 5.0, -4]}>
          <MysticalTorusKnot position={[0, 0, 0]} color="#f43f5e" />
        </group>
        <FanzAgentGuardian 
          basePosition={[-5.8, 2.2, -4.8]} 
          color="#f43f5e" 
          speed={1.3} 
          hoverRadius={1.1} 
        />

        <group position={[0, 0.5, 0]}>
          <mesh position={[0, 1.2, 0]}>
            <dodecahedronGeometry args={[0.55]} />
            <meshStandardMaterial emissive="#eab308" color="#ffffff" roughness={0.1} metalness={0.9} wireframe />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <sphereGeometry args={[0.26, 16, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.65} />
          </mesh>
          <QuantumFruit />
          <QuantumFruit />
          <QuantumFruit />
          <QuantumFruit />
          <mesh position={[0, -0.6, 0]}>
             <cylinderGeometry args={[2.5, 3.2, 0.22, 32]} />
             <meshStandardMaterial color="#0c0d14" roughness={0.4} metalness={0.9} />
          </mesh>
          <mesh position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
             <ringGeometry args={[2.2, 2.45, 32]} />
             <meshBasicMaterial color="#eab308" side={THREE.DoubleSide} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
             <ringGeometry args={[1.5, 1.7, 32]} />
             <meshBasicMaterial color="#00ffcc" side={THREE.DoubleSide} transparent opacity={0.6} />
          </mesh>
        </group>

        <gridHelper args={[60, 60, '#3b227e', '#130d2d']} position={[0, -0.49, 0]} />

        <CitySkyline />

        <TermuxBillboard 
          position={[-8.5, 6.2, -11.5]} 
          rotation={[0, 0.45, 0]} 
          scale={0.82} 
          terminalName="Forge-Core-Sync" 
          themeColor="#eab308"
        />

        <TermuxBillboard 
          position={[8.5, 5.8, -13.5]} 
          rotation={[0, -0.42, 0]} 
          scale={0.88} 
          terminalName="Ecosystem-Refinery" 
          themeColor="#ff2e93"
        />

        <TermuxBillboard 
          position={[-11.5, 3.8, 8.5]} 
          rotation={[0, 1.15, 0]} 
          scale={0.72} 
          terminalName="Student-Sandbox" 
          themeColor="#3b82f6"
        />

        <TermuxBillboard 
          position={[10.5, 5.2, 11.5]} 
          rotation={[0, -1.22, 0]} 
          scale={0.78} 
          terminalName="Market-Collector" 
          themeColor="#a855f7"
        />

        <TermuxBillboard 
          position={[0, 9.2, -18.5]} 
          rotation={[0.12, 0, 0]} 
          scale={1.25} 
          terminalName="CityNet-Console" 
          themeColor="#00ffcc"
        />

        <TermuxBillboard 
          position={[-15.5, 7.0, -2.5]} 
          rotation={[0, 1.5, 0]} 
          scale={0.8} 
          terminalName="Command-Relay" 
          themeColor="#f43f5e"
        />

        <TermuxBillboard 
          position={[15.5, 7.2, -2.0]} 
          rotation={[0, -1.5, 0]} 
          scale={0.8} 
          terminalName="PrintLab-Queue" 
          themeColor="#00ffcc"
        />

        <GuardianSwarm />
      </group>
    </>
  );
}


export default function NexusHub3D({ onNavigate }: NexusHub3DProps) {
  // HUD states for the interactive districts that are expanding
  const [hudMessage, setHudMessage] = useState<{ title: string; subtitle: string; body: string; color: string } | null>(null);

  const handlePortalEnter = (targetRoom: string) => {
    if (targetRoom === 'sandbox') {
      setHudMessage({
        title: 'STUDENT STUDIO & LEARNING CENTER',
        subtitle: 'DEVELOPER CHANNELS INITIALIZING',
        body: 'Fanz Workspace Academy of Agents is bootstrapping. Interactive coding exercises, mCP server deployment manuals, core concepts, and sandbox playgrounds are synchronizing to your developer session. Keep learning!',
        color: 'border-yellow-500/40 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.25)]',
      });
    } else if (targetRoom === 'marketplace') {
      setHudMessage({
        title: 'MARKETPLACE PLAZA',
        subtitle: 'SECURE AGENT DEPOT ONLINE',
        body: 'Holographic asset depot is online. Ready to browse reusable 3D model specs, pre-constructed FanzAgent Guardian droids, custom workspace schemas, and proprietary agent prompts. Commencing secure indexing...',
        color: 'border-purple-500/40 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.25)]',
      });
    } else {
      onNavigate(targetRoom);
    }
  };

  return (
    <div className="w-full h-full absolute inset-0 z-20 bg-[#06040e] overflow-hidden select-none">
      
      {/* Dynamic 2D Cosmic nebulas */}
      <div className="absolute inset-0 bg-transparent pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-[85vw] h-[85vw] rounded-full bg-purple-600/15 blur-[120px] animate-pulse" style={{ animationDuration: '11s' }} />
        <div className="absolute -bottom-1/4 -right-1/4 w-[80vw] h-[80vw] rounded-full bg-amber-500/10 blur-[130px] animate-pulse" style={{ animationDuration: '14s' }} />
        <div className="absolute top-1/3 left-1/3 w-[65vw] h-[65vw] rounded-full bg-cyan-500/15 blur-[110px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/4 right-1/4 w-[60vw] h-[60vw] rounded-full bg-[#ec4899]/8 blur-[120px] animate-pulse" style={{ animationDuration: '13s' }} />
      </div>

      <div className="w-full h-full relative z-10">
          <Canvas camera={{ position: [0, 5, 14], fov: 60 }} gl={{ alpha: true }}>
            <NexusSceneContent handlePortalEnter={handlePortalEnter} />
            
            <OrbitControls 
              enableDamping 
              dampingFactor={0.035} 
              rotateSpeed={0.85} 
              zoomSpeed={1.0} 
              maxDistance={35} 
              minDistance={3.5} 
              maxPolarAngle={Math.PI / 2 - 0.05} 
            />
          </Canvas>
        </div>

      {/* FLOAT NAVIGATION / OVERRIDES CARD */}
      <div className="absolute bottom-6 left-6 z-30 flex gap-2">
      </div>

      {/* 2D Overlay title logo over the 3D Nexus */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none z-20 text-center select-none w-full max-w-2xl px-4">
           <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400 tracking-[0.22em] uppercase font-sans drop-shadow-[0_0_20px_rgba(251,191,36,0.35)] leading-tight">
              THE ONE
           </h1>
           <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00ffcc] via-[#a855f7] to-[#ec4899] tracking-[0.14em] uppercase font-sans drop-shadow-[0_0_25px_rgba(0,255,204,0.4)] leading-snug mt-1.5">
              AGENTIC CITY
           </h1>
           <p className="mt-6 text-[#00ffcc] font-mono text-[9px] md:text-xs tracking-[0.28em] uppercase drop-shadow-[0_0_8px_rgba(0,255,204,0.45)] font-semibold">
              SELECT A PORTAL TO ENTER THE SIMULATION
           </p>
        </div>

      {/* Interactive responsive HUD popup modals for District expanders */}
      {hudMessage && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`bg-[#05060b]/95 border ${hudMessage.color} p-6 md:p-8 rounded-lg max-w-lg w-full transition-all duration-300 pointer-events-auto`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[9px] font-mono tracking-[0.25em] text-[#00ffcc] uppercase block mb-1">
                  {hudMessage.subtitle}
                </span>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
                  {hudMessage.title}
                </h3>
              </div>
            </div>
            
            <p className="text-gray-400 font-sans font-medium text-sm leading-relaxed mb-6">
              {hudMessage.body}
            </p>

            <button
               onClick={() => setHudMessage(null)}
               className="w-full py-2.5 bg-white/5 border border-white/10 hover:border-[#00ffcc]/35 hover:bg-[#00ffcc]/10 text-xs text-white hover:text-[#00ffcc] font-mono uppercase tracking-[0.15em] rounded transition-all duration-300"
            >
               Close Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
