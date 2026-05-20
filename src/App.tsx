import React, { useState } from 'react';
import EcosystemGalaxy from './rooms/EcosystemGalaxy';
import ThirdEyeForge from './ThirdEyeForge';
import ConstructionSimulator from './rooms/ConstructionSimulator';
import PrintLab from './rooms/PrintLab';
import { motion, AnimatePresence } from 'motion/react';
import { xrStore } from './xrStore';

export default function App() {
  const [currentRoom, setCurrentRoom] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_current_room') || 'hub';
    }
    return 'hub';
  });

  const handleExit = () => {
    // Attempt to end XR session before unmounting if it exists
    const state = xrStore.getState();
    if (state?.session) {
       try { state.session.end(); } catch(e) { console.error(e); }
    }
    setCurrentRoom('hub');
    localStorage.setItem('nexus_current_room', 'hub');
  };

  const navigateTo = (room: string) => {
    setCurrentRoom(room);
    localStorage.setItem('nexus_current_room', room);
  };

  return (
    <div className="w-full h-screen bg-[#050505] text-white overflow-hidden relative font-sans">
      
        {/* HUB VIEW */}
        <AnimatePresence mode="wait">
        {currentRoom === 'hub' && (
          <motion.div 
             key="hub"
             className="w-full h-full absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050505]"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
             
             <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase font-sans">
               Simulation <span className="text-blue-500">Nexus</span>
             </h1>
             <p className="max-w-2xl text-center text-gray-400 mb-16 font-mono text-xs md:text-sm leading-relaxed px-4">
               SELECT AN ENVIRONMENT TO ENTER. TRAIN FOR FATAL POSSIBILITIES. TEST WITS OUTSIDE THE SAFE ZONE. BRING BLUEPRINTS TO LIFE.
             </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-7xl px-6">
                <button 
                  title="Refinery for raw memories, trauma, and foundational growth."
                  onClick={() => navigateTo('forge')}
                  className="group relative p-8 border border-white/5 bg-white/5 hover:bg-white/10 transition-all rounded-lg overflow-hidden text-left"
                >
                   <div className="absolute left-0 top-0 w-1 h-full bg-[#00ffcc] group-hover:w-full group-hover:bg-[#00ffcc]/10 transition-all duration-500 z-0" />
                   <div className="relative z-10 flex flex-col h-full">
                     <div>
                       <h2 className="text-2xl font-black text-white uppercase tracking-tight">Third Eye Forge</h2>
                       <p className="text-[#00ffcc] font-mono text-[10px] tracking-widest mt-1 uppercase">Personal Lore & Growth</p>
                     </div>
                     <p className="text-gray-400 mt-4 text-sm relative z-10 font-sans font-medium flex-grow">Refinery for raw memories, trauma, and foundational growth.</p>
                   </div>
                </button>

                <button 
                  title="Interactive tour of mCP server index, Flow Fanz Agents, and live builds."
                  onClick={() => navigateTo('ecosystem')}
                  className="group relative p-8 border border-white/5 bg-white/5 hover:bg-white/10 transition-all rounded-lg overflow-hidden text-left"
                >
                   <div className="absolute left-0 top-0 w-1 h-full bg-[#ffcc00] group-hover:w-full group-hover:bg-[#ffcc00]/10 transition-all duration-500 z-0" />
                   <div className="relative z-10 flex flex-col h-full">
                     <div>
                       <h2 className="text-2xl font-black text-white uppercase tracking-tight">The Vision Board</h2>
                       <p className="text-[#ffcc00] font-mono text-[10px] tracking-widest mt-1 uppercase">Ecosystem Galaxy</p>
                     </div>
                     <p className="text-gray-400 mt-4 text-sm relative z-10 font-sans font-medium flex-grow">Interactive tour of mCP server index, Flow Fanz Agents, and live builds.</p>
                   </div>
                </button>

                <button 
                  title="Test safety, identify architectural flaws, and learn consequences in high-stakes environments."
                  onClick={() => navigateTo('construction_sim')}
                  className="group relative p-8 border border-white/5 bg-white/5 hover:bg-white/10 transition-all rounded-lg overflow-hidden text-left backdrop-blur-sm"
                >
                   <div className="absolute left-0 top-0 w-1 h-full bg-orange-500 group-hover:w-full group-hover:bg-orange-500/10 transition-all duration-500 z-0" />
                   <div className="relative z-10 flex flex-col h-full">
                     <div className="flex justify-between items-start">
                       <div>
                         <h2 className="text-2xl font-black text-white uppercase tracking-tight">Jobsite VR</h2>
                         <p className="text-orange-500 font-mono text-[10px] tracking-widest mt-1 uppercase">Commercial & Residential</p>
                       </div>
                       <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded font-mono uppercase tracking-widest ml-2 hidden lg:block">Fatal Consequence</span>
                     </div>
                     <p className="text-gray-400 mt-4 text-sm relative z-10 font-sans font-medium flex-grow">Test safety, identify architectural flaws, and learn consequences in high-stakes environments.</p>
                   </div>
                </button>

                <button 
                  title="Upload images or specify parts (RC cars, drones) and AI generates optimal 3D print specs for Labists."
                  onClick={() => navigateTo('print_lab')}
                  className="group relative p-8 border border-white/5 bg-white/5 hover:bg-white/10 transition-all rounded-lg overflow-hidden text-left backdrop-blur-sm"
                >
                   <div className="absolute left-0 top-0 w-1 h-full bg-blue-500 group-hover:w-full group-hover:bg-blue-500/10 transition-all duration-500 z-0" />
                   <div className="relative z-10 flex flex-col h-full">
                     <div className="flex justify-between items-start">
                       <div>
                         <h2 className="text-2xl font-black text-white uppercase tracking-tight">3D Print Lab</h2>
                         <p className="text-blue-500 font-mono text-[10px] tracking-widest mt-1 uppercase">Prototyping & Replication</p>
                       </div>
                     </div>
                     <p className="text-gray-400 mt-4 text-sm relative z-10 font-sans font-medium flex-grow">Upload images or specify parts (RC cars, drones) and AI generates optimal 3D print specs for Labists.</p>
                   </div>
                </button>
              </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ROOM VIEWS - HIDDEN/SHOWN VIA CSS TO PRESERVE STATE & PREVENT WEBGL RESIZEOBSERVER CRASH (0x0 SIZE) */}
        <div style={{ visibility: currentRoom === 'forge' ? 'visible' : 'hidden', opacity: currentRoom === 'forge' ? 1 : 0, pointerEvents: currentRoom === 'forge' ? 'auto' : 'none' }} className="w-full h-full absolute inset-0 z-10 transition-opacity">
             <button onClick={handleExit} className="absolute bottom-6 left-6 z-50 text-[#00ffcc] font-mono text-[10px] hover:bg-[#00ffcc]/10 uppercase tracking-widest bg-black/50 px-4 py-2 border border-[#00ffcc]/30 backdrop-blur-md rounded transition-colors">&lt; EXIT / RETURN TO NEXUS</button>
             <ThirdEyeForge />
        </div>

        <div style={{ visibility: currentRoom === 'ecosystem' ? 'visible' : 'hidden', opacity: currentRoom === 'ecosystem' ? 1 : 0, pointerEvents: currentRoom === 'ecosystem' ? 'auto' : 'none' }} className="w-full h-full absolute inset-0 z-10 transition-opacity">
             <button onClick={handleExit} className="absolute bottom-6 left-6 z-50 text-[#ffcc00] font-mono text-[10px] hover:bg-[#ffcc00]/10 uppercase tracking-widest bg-black/50 px-4 py-2 border border-[#ffcc00]/30 backdrop-blur-md rounded transition-colors">&lt; EXIT / RETURN TO NEXUS</button>
             <EcosystemGalaxy />
        </div>

        <div style={{ visibility: currentRoom === 'construction_sim' ? 'visible' : 'hidden', opacity: currentRoom === 'construction_sim' ? 1 : 0, pointerEvents: currentRoom === 'construction_sim' ? 'auto' : 'none' }} className="w-full h-full absolute inset-0 z-10 transition-opacity">
             <button onClick={handleExit} className="absolute bottom-6 left-6 z-50 text-orange-500 font-mono text-[10px] hover:bg-orange-500/10 uppercase tracking-widest bg-black/50 px-4 py-2 border border-orange-500/30 backdrop-blur-md rounded transition-colors">&lt; EXIT / RETURN TO NEXUS</button>
             <ConstructionSimulator />
        </div>

        <div style={{ visibility: currentRoom === 'print_lab' ? 'visible' : 'hidden', opacity: currentRoom === 'print_lab' ? 1 : 0, pointerEvents: currentRoom === 'print_lab' ? 'auto' : 'none' }} className="w-full h-full absolute inset-0 z-10 transition-opacity">
             <button onClick={handleExit} className="absolute bottom-6 left-6 z-50 text-blue-500 font-mono text-[10px] hover:bg-blue-500/10 uppercase tracking-widest bg-black/50 px-4 py-2 border border-blue-500/30 backdrop-blur-md rounded transition-colors">&lt; EXIT / RETURN TO NEXUS</button>
             <PrintLab />
        </div>
    </div>
  );
}
