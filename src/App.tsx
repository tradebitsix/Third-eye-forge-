import React, { useState } from 'react';
import ThirdEyeForge from './ThirdEyeForge';
import ConstructionSimulator from './rooms/ConstructionSimulator';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentRoom, setCurrentRoom] = useState<string>('hub');

  return (
    <div className="w-full h-screen bg-[#050505] text-white overflow-hidden relative font-sans">
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

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl px-6">
                <button 
                  onClick={() => setCurrentRoom('forge')}
                  className="group relative p-8 border border-white/5 bg-white/5 hover:bg-white/10 transition-all rounded-lg overflow-hidden text-left"
                >
                   <div className="absolute left-0 top-0 w-1 h-full bg-[#00ffcc] group-hover:w-full group-hover:bg-[#00ffcc]/10 transition-all duration-500 z-0" />
                   <div className="relative z-10 flex justify-between items-start">
                     <div>
                       <h2 className="text-2xl font-black text-white uppercase tracking-tight">Third Eye Forge</h2>
                       <p className="text-[#00ffcc] font-mono text-[10px] tracking-widest mt-1 uppercase">Personal Lore & Growth</p>
                     </div>
                   </div>
                   <p className="text-gray-400 mt-4 text-sm relative z-10 font-sans font-medium">Refinery for raw memories, trauma, and foundational growth.</p>
                </button>

                <button 
                  onClick={() => setCurrentRoom('construction_sim')}
                  className="group relative p-8 border border-white/5 bg-white/5 hover:bg-white/10 transition-all rounded-lg overflow-hidden text-left backdrop-blur-sm"
                >
                   <div className="absolute left-0 top-0 w-1 h-full bg-orange-500 group-hover:w-full group-hover:bg-orange-500/10 transition-all duration-500 z-0" />
                   <div className="relative z-10 flex justify-between items-start">
                     <div>
                       <h2 className="text-2xl font-black text-white uppercase tracking-tight">Jobsite VR Simulator</h2>
                       <p className="text-orange-500 font-mono text-[10px] tracking-widest mt-1 uppercase">Commercial & Residential</p>
                     </div>
                     <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded font-mono uppercase tracking-widest">Fatal Consequence</span>
                   </div>
                   <p className="text-gray-400 mt-4 text-sm relative z-10 font-sans font-medium">Test safety, identify architectural flaws, stage materials, and learn consequences in high-stakes framing and roofing environments.</p>
                </button>
             </div>
          </motion.div>
        )}

        {currentRoom === 'forge' && (
          <motion.div key="forge" className="w-full h-full absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <button onClick={() => setCurrentRoom('hub')} className="absolute bottom-6 left-6 z-50 text-[#00ffcc] font-mono text-[10px] hover:bg-[#00ffcc]/10 uppercase tracking-widest bg-black/50 px-4 py-2 border border-[#00ffcc]/30 backdrop-blur-md rounded transition-colors">&lt; EXIT / RETURN TO NEXUS</button>
             <ThirdEyeForge />
          </motion.div>
        )}

        {currentRoom === 'construction_sim' && (
          <motion.div key="construction_sim" className="w-full h-full absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <button onClick={() => setCurrentRoom('hub')} className="absolute bottom-6 left-6 z-50 text-orange-500 font-mono text-[10px] hover:bg-orange-500/10 uppercase tracking-widest bg-black/50 px-4 py-2 border border-orange-500/30 backdrop-blur-md rounded transition-colors">&lt; EXIT / RETURN TO NEXUS</button>
             <ConstructionSimulator />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
