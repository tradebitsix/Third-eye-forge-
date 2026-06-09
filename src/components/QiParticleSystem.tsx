import React, { useMemo } from 'react';

interface Particle {
  id: number;
  left: string;
  delay: string;
  duration: string;
  size: string;
  hue: string;
}

export default function QiParticleSystem() {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${10 + Math.random() * 15}s`,
      size: `${2 + Math.random() * 6}px`,
      // Cyan to Purple / Gold energy vibe
      hue: Math.random() > 0.5 ? '190' : Math.random() > 0.5 ? '280' : '45', 
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center mix-blend-screen opacity-60">
      
      {/* Central swirling Qi core hint */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle,rgba(0,212,255,0.05)_0%,transparent_70%)] rounded-full animate-pulse blur-3xl pointer-events-none" style={{ animationDuration: '6s' }} />

      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-[-10px] animate-qi-flow rounded-full pointer-events-none"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: `hsl(${p.hue}, 100%, 75%)`,
            boxShadow: `0 0 ${parseInt(p.size) * 3}px hsl(${p.hue}, 100%, 65%)`,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}
