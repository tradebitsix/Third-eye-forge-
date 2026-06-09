import React, { useState, useEffect } from 'react';

/**
 * Custom hook to generate automatic blinking states for organic/AI personas
 */
function useBlink(intervalMs: number = 3000) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 150);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        triggerBlink();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return isBlinking;
}

interface AgentProps {
  className?: string;
  glowColor?: string;
  size?: number;
}

export function FanzoHolo({ className = "", size = 260 }: AgentProps) {
  const isBlinking = useBlink(2800);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let frame: number;
    const run = (time: number) => {
      setPulse(Math.sin(time / 600));
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, []);

  const bobOffset = pulse * 4;

  return (
    <div 
      className={`relative flex flex-col items-center select-none ${className}`} 
      style={{ width: size, height: size + 40 }}
    >
      {/* CSS-based dynamic portal lighting shadow */}
      <div 
        className="absolute bottom-4 w-40 h-5 bg-[#00d4ff]/15 rounded-full blur-md transition-all duration-300"
        style={{ 
          transform: `scale(${1 - pulse * 0.05})`,
          opacity: 0.6 + pulse * 0.15 
        }}
      />

      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 240 280" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_15px_rgba(0,212,255,0.4)]"
        style={{ transform: `translateY(${bobOffset}px)` }}
      >
        <defs>
          {/* Neon Glow Filters */}
          <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="brightGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Wireframe Grid Pattern */}
          <pattern id="gridPattern" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#00d4ff" strokeWidth="0.4" strokeOpacity="0.45" />
          </pattern>

          {/* 3D Curved Topo Grid for Sphere mapping effect */}
          <pattern id="curvedGrid" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="8" fill="none" stroke="#00d4ff" strokeWidth="0.3" strokeOpacity="0.3" />
            <line x1="0" y1="8" x2="16" y2="8" stroke="#00d4ff" strokeWidth="0.5" strokeOpacity="0.4" />
            <line x1="8" y1="0" x2="8" y2="16" stroke="#00d4ff" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>

          {/* Core Gradients */}
          <linearGradient id="cyberBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a2540" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#001833" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="glowGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0055ff" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* 1. STANDING BASE PEDESTAL */}
        <g opacity="0.85">
          {/* Base outer ring */}
          <ellipse cx="120" cy="254" rx="64" ry="12" stroke="#00d4ff" strokeWidth="1.5" strokeDasharray="3 2" filter="url(#cyanGlow)" />
          {/* Solid fill glowing center */}
          <ellipse cx="120" cy="254" rx="56" ry="9" fill="url(#glowGlow)" stroke="#00d4ff" strokeWidth="0.75" />
          {/* Base core center support */}
          <ellipse cx="120" cy="251" rx="36" ry="6" fill="#003566" stroke="#00ffff" strokeWidth="1" />
        </g>

        {/* CONNECTION RAYS */}
        <line x1="85" y1="220" x2="88" y2="250" stroke="#00d4ff" strokeWidth="0.5" strokeDasharray="2 4" strokeOpacity="0.6" />
        <line x1="155" y1="220" x2="152" y2="250" stroke="#00d4ff" strokeWidth="0.5" strokeDasharray="2 4" strokeOpacity="0.6" />

        {/* 2. BODY STRUCTURE (Wireframe overlay styled) */}
        {/* Legs / Feet */}
        <g filter="url(#cyanGlow)">
          {/* Left foot */}
          <rect x="91" y="215" width="22" height="15" rx="7" fill="url(#cyberBaseGrad)" stroke="#00d4ff" strokeWidth="1.2" />
          <path d="M 91 222 L 113 222" stroke="#00d4ff" strokeWidth="0.5" strokeOpacity="0.5" />
          
          {/* Right foot */}
          <rect x="127" y="215" width="22" height="15" rx="7" fill="url(#cyberBaseGrad)" stroke="#00d4ff" strokeWidth="1.2" />
          <path d="M 127 222 L 149 222" stroke="#00d4ff" strokeWidth="0.5" strokeOpacity="0.5" />

          {/* Main Chibi Torso */}
          <path d="M 85 150 C 85 135, 155 135, 155 150 L 148 215 C 148 218, 92 218, 92 215 Z" fill="url(#cyberBaseGrad)" stroke="#00d4ff" strokeWidth="1.5" />
          {/* Grid lines over body */}
          <path d="M 85 150 C 85 135, 155 135, 155 150 L 148 215 C 148 218, 92 218, 92 215 Z" fill="url(#gridPattern)" />
          
          {/* Outer edge body lines for volumetric look */}
          <path d="M 100 144 Q 120 155, 140 144" stroke="#00d4ff" strokeWidth="0.8" strokeOpacity="0.6" />
          <path d="M 95 174 Q 120 188, 145 174" stroke="#00d4ff" strokeWidth="0.8" strokeOpacity="0.6" />
          <path d="M 93 200 Q 120 212, 147 200" stroke="#00d4ff" strokeWidth="0.8" strokeOpacity="0.6" />
          <line x1="120" y1="140" x2="120" y2="216" stroke="#00d4ff" strokeWidth="0.8" strokeOpacity="0.5" />
        </g>

        {/* Hoodie/Chest Graphic Badge */}
        <g transform="translate(108, 158)" filter="url(#cyanGlow)">
          <polygon points="12,0 24,8 18,22 6,22 0,8" fill="#002244" stroke="#00ffff" strokeWidth="1" />
          <circle cx="12" cy="11" r="4.5" fill="#00d4ff" className="animate-pulse" />
        </g>

        {/* Left Arm & Briefcase */}
        <g filter="url(#cyanGlow)">
          {/* Left shoulder/Arm */}
          <path d="M 153 150 Q 175 160, 168 185" fill="none" stroke="#00d4ff" strokeWidth="6" strokeLinecap="round" />
          <path d="M 153 150 Q 175 160, 168 185" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
          
          {/* Briefcase */}
          <g transform="translate(154, 182)">
            {/* Case handle */}
            <path d="M 10 0 Q 17 -10, 24 0" fill="none" stroke="#00d4ff" strokeWidth="1.5" />
            {/* Laptop Briefcase Body */}
            <rect x="0" y="0" width="34" height="24" rx="3" fill="url(#cyberBaseGrad)" stroke="#00d4ff" strokeWidth="1.5" />
            {/* Grid pattern on suit handle */}
            <rect x="0" y="0" width="34" height="24" rx="3" fill="url(#gridPattern)" />
            {/* Center Lock latch badge */}
            <rect x="14" y="6" width="6" height="5" fill="#00ffff" stroke="#ffffff" strokeWidth="0.5" />
            {/* Linear corner structural lines on suitcase */}
            <path d="M 0 0 L 10 8 L 24 8 L 34 0 M 0 24 L 10 16 L 24 16 L 34 24" stroke="#00d4ff" strokeWidth="0.5" strokeOpacity="0.7" />
          </g>
        </g>

        {/* Right Arm waving */}
        <g filter="url(#cyanGlow)">
          {/* Shoulder to waving hand */}
          <path d="M 87 150 C 72 153, 62 165, 52 173" fill="none" stroke="#00d4ff" strokeWidth="6" strokeLinecap="round" />
          <path d="M 87 150 C 72 153, 62 165, 52 173" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
          {/* Glowing hand index ball */}
          <circle cx="50" cy="174" r="5" fill="url(#cyberBaseGrad)" stroke="#00d4ff" strokeWidth="1.5" />
          <circle cx="50" cy="174" r="1.5" fill="#00ffff" />
        </g>

        {/* 3. HEAD & CHIBI PORTRAIT CONTROLS */}
        <g filter="url(#cyanGlow)">
          {/* Large dynamic sphere head */}
          <circle cx="120" cy="98" r="44" fill="url(#cyberBaseGrad)" stroke="#00d4ff" strokeWidth="1.8" />
          {/* Volumetric curved grid warp projection */}
          <circle cx="120" cy="98" r="44" fill="url(#curvedGrid)" />

          {/* Cheek line details */}
          <path d="M 81 106 Q 90 120, 102 112" stroke="#00ffff" strokeWidth="0.5" strokeOpacity="0.6" />
          <path d="M 159 106 Q 150 120, 138 112" stroke="#00ffff" strokeWidth="0.5" strokeOpacity="0.6" />
        </g>

        {/* CYBER GLASSES (glowing neon cyan) */}
        <g filter="url(#brightGlow)">
          {/* Glass frame */}
          {/* Left lens */}
          <rect x="85" y="91" width="30" height="18" rx="4" fill="rgba(0, 212, 255, 0.15)" stroke="#00ffff" strokeWidth="1.8" />
          <path d="M 87 96 L 102 96" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.7" />
          
          {/* Right lens */}
          <rect x="125" y="91" width="30" height="18" rx="4" fill="rgba(0, 212, 255, 0.15)" stroke="#00ffff" strokeWidth="1.8" />
          <path d="M 127 96 L 142 96" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.7" />

          {/* Glasses Bridge line */}
          <rect x="115" y="95" width="10" height="3" fill="#00ffff" />
          {/* Ears-sides frame */}
          <path d="M 85 97 L 76 92" stroke="#00d4ff" strokeWidth="1.5" />
          <path d="M 155 97 L 164 92" stroke="#00d4ff" strokeWidth="1.5" />
        </g>

        {/* GLOWING CHARISMATIC EYE DOTS (Blinking handler) */}
        {!isBlinking ? (
          <g>
            <circle cx="100" cy="100" r="4" fill="#ffffff" filter="url(#cyanGlow)" />
            <circle cx="140" cy="100" r="4" fill="#ffffff" filter="url(#cyanGlow)" />
            {/* Inner tiny twinkle */}
            <circle cx="101" cy="99" r="1.2" fill="#00d4ff" />
            <circle cx="141" cy="99" r="1.2" fill="#00d4ff" />
          </g>
        ) : (
          <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" filter="url(#cyanGlow)">
            {/* Blinking flat slit */}
            <line x1="95" y1="100" x2="105" y2="100" />
            <line x1="135" y1="100" x2="145" y2="100" />
          </g>
        )}

        {/* Friendly AI Smile */}
        <path d="M 112 115 Q 120 123, 128 115" fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" filter="url(#cyanGlow)" />

        {/* 4. BASEBALL CAP with "by fanzoftheone" text peak */}
        <g filter="url(#brightGlow)">
          {/* Hat dome section */}
          <path d="M 77 91 C 77 56, 163 56, 163 91 Z" fill="url(#cyberBaseGrad)" stroke="#00ffff" strokeWidth="1.5" />
          <path d="M 77 91 C 77 56, 163 56, 163 91 Z" fill="url(#gridPattern)" />
          {/* Hat panels stitching */}
          <path d="M 120 58 L 120 91" stroke="#00ffff" strokeWidth="0.75" strokeOpacity="0.6" />
          <path d="M 120 58 Q 98 75, 77 91" stroke="#00ffff" strokeWidth="0.75" strokeOpacity="0.6" />
          <path d="M 120 58 Q 142 75, 163 91" stroke="#00ffff" strokeWidth="0.75" strokeOpacity="0.6" />

          {/* Top button node */}
          <circle cx="120" cy="57" r="3" fill="#ffffff" stroke="#00ffff" strokeWidth="1" />

          {/* Brim/Peak pointing to the left-front */}
          <path d="M 72 90 C 65 91, 58 100, 71 106 C 88 114, 122 115, 134 104 C 137 101, 132 94, 124 93 Z" fill="url(#cyberBaseGrad)" stroke="#00ffff" strokeWidth="1.5" />
          
          {/* Glow edge highlight of brim */}
          <path d="M 58 100 Q 75 113, 125 106" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
        </g>

        {/* Brim text: "by fanzoftheone" or "by fanzo" */}
        <g transform="rotate(-10, 92, 102)">
          <text 
            x="70" 
            y="106" 
            fill="#ffffff" 
            fontSize="5.5" 
            fontFamily="monospace" 
            fontWeight="black" 
            letterSpacing="0.05em"
            opacity="0.95"
            textAnchor="middle"
          >
            by fanzoftheone
          </text>
        </g>

        {/* Text Signage Overlay "Fanzo that AI." */}
        <g transform="translate(120, 260)">
          {/* Translucent Backdrop banner */}
          <rect x="-65" y="-1" width="130" height="23" rx="4" fill="rgba(0, 15, 30, 0.75)" stroke="#00b4d8" strokeWidth="0.75" />
          
          <text 
            x="0" 
            y="10" 
            fill="#ffffff" 
            fontSize="10" 
            fontFamily="ui-sans-serif, system-ui, sans-serif" 
            fontWeight="900" 
            letterSpacing="0.06em"
            textAnchor="middle"
            filter="url(#cyanGlow)"
          >
            Fanzo
          </text>
          <text 
            x="0" 
            y="19" 
            fill="#00ffff" 
            fontSize="7" 
            fontFamily="monospace" 
            fontWeight="bold" 
            letterSpacing="0.1em"
            textAnchor="middle"
          >
            THAT AI.
          </text>
        </g>
      </svg>
    </div>
  );
}

export function EchoHolo({ className = "", size = 260 }: AgentProps) {
  const isBlinking = useBlink(3100);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let frame: number;
    const run = (time: number) => {
      setPulse(Math.sin((time + 500) / 550));
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, []);

  const bobOffset = pulse * 4.5;

  return (
    <div 
      className={`relative flex flex-col items-center select-none ${className}`} 
      style={{ width: size, height: size + 40 }}
    >
      {/* CSS-based dynamic portal lighting shadow */}
      <div 
        className="absolute bottom-5 w-40 h-5 bg-purple-500/15 rounded-full blur-md transition-all duration-300"
        style={{ 
          transform: `scale(${1 - pulse * 0.055})`,
          opacity: 0.6 + pulse * 0.15 
        }}
      />

      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 240 280" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_18px_rgba(168,85,247,0.45)]"
        style={{ transform: `translateY(${bobOffset}px)` }}
      >
        <defs>
          {/* Neon Glow Filters */}
          <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="fuchsiaGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="ultraBright" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="b1" />
            <feMerge>
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Purple grid pattern */}
          <pattern id="purpleGrid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#a855f7" strokeWidth="0.45" strokeOpacity="0.45" />
          </pattern>

          {/* Curved spherical mapping wireframe */}
          <pattern id="curvedPurpleGrid" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="8" fill="none" stroke="#a855f7" strokeWidth="0.32" strokeOpacity="0.3" />
            <line x1="0" y1="8" x2="16" y2="8" stroke="#a855f7" strokeWidth="0.5" strokeOpacity="0.4" />
            <line x1="8" y1="0" x2="8" y2="16" stroke="#a855f7" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>

          {/* Gradients */}
          <linearGradient id="purpleBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a0033" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#08001a" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="baseLaser" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d946ef" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
          </linearGradient>

          {/* Neon E cursive typography path fallback */}
          <linearGradient id="neonTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>

        {/* 1. CURSIVE TYPOGRAPHY GLOW ("Echo" neon script overlay sign above head) */}
        <g filter="url(#ultraBright)" transform="translate(120, 24)">
          {/* Glowing script label representation offset */}
          <text 
            x="0" 
            y="12" 
            fill="none" 
            stroke="#ff00ff" 
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fontFamily="Brush Script MT, cursive, sans-serif" 
            fontSize="34" 
            fontStyle="italic" 
            fontWeight="bold" 
            textAnchor="middle"
            opacity="0.4"
          >
            Echo
          </text>
          <text 
            x="0" 
            y="12" 
            fill="url(#neonTextGrad)" 
            stroke="#ffffff" 
            strokeWidth="1.3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fontFamily="Brush Script MT, cursive, sans-serif" 
            fontSize="34" 
            fontStyle="italic" 
            fontWeight="bold" 
            textAnchor="middle"
          >
            Echo
          </text>
        </g>

        {/* 2. BASE PEDESTAL STAGE */}
        <g opacity="0.85">
          {/* Base outer boundary circle */}
          <ellipse cx="120" cy="254" rx="64" ry="12" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 2" filter="url(#purpleGlow)" />
          {/* Inner purple neon emitter */}
          <ellipse cx="120" cy="254" rx="56" ry="9" fill="url(#baseLaser)" stroke="#d946ef" strokeWidth="0.75" />
          {/* Core center anchor node */}
          <ellipse cx="120" cy="251" rx="36" ry="6" fill="#1b003a" stroke="#f472b6" strokeWidth="1" />
        </g>

        {/* Connection matrix beam strands */}
        <line x1="85" y1="220" x2="88" y2="250" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="2 4" strokeOpacity="0.6" />
        <line x1="155" y1="220" x2="152" y2="250" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="2 4" strokeOpacity="0.6" />

        {/* 3. BODY STRUCTURE (Wireframe overlay styled) */}
        {/* Legs / Feet */}
        <g filter="url(#purpleGlow)">
          {/* Left foot */}
          <rect x="91" y="215" width="22" height="15" rx="7" fill="url(#purpleBaseGrad)" stroke="#a855f7" strokeWidth="1.2" />
          <path d="M 91 222 L 113 222" stroke="#d946ef" strokeWidth="0.5" strokeOpacity="0.5" />
          
          {/* Right foot */}
          <rect x="127" y="215" width="22" height="15" rx="7" fill="url(#purpleBaseGrad)" stroke="#a855f7" strokeWidth="1.2" />
          <path d="M 127 222 L 149 222" stroke="#d946ef" strokeWidth="0.5" strokeOpacity="0.5" />

          {/* Main Chibi Torso */}
          <path d="M 85 150 C 85 135, 155 135, 155 150 L 148 215 C 148 218, 92 218, 92 215 Z" fill="url(#purpleBaseGrad)" stroke="#a855f7" strokeWidth="1.5" />
          <path d="M 85 150 C 85 135, 155 135, 155 150 L 148 215 C 148 218, 92 218, 92 215 Z" fill="url(#purpleGrid)" />

          {/* Topo lines on body */}
          <path d="M 100 144 Q 120 155, 140 144" stroke="#a855f7" strokeWidth="0.8" strokeOpacity="0.6" />
          <path d="M 95 174 Q 120 188, 145 174" stroke="#a855f7" strokeWidth="0.8" strokeOpacity="0.6" />
          <path d="M 93 200 Q 120 212, 147 200" stroke="#a855f7" strokeWidth="0.8" strokeOpacity="0.6" />
          <line x1="120" y1="140" x2="120" y2="216" stroke="#d946ef" strokeWidth="0.8" strokeOpacity="0.5" />
        </g>

        {/* Chest Badge Emblem (Aesthetic Heart Core) */}
        <g transform="translate(112, 162)" filter="url(#purpleGlow)">
          <path d="M6,2 C4,0 1,0 0,2 C-1,4 1.5,8 6,11 C10.5,8 13,4 12,2 C11,0 8,0 6,2 Z" fill="#d946ef" className="animate-pulse" />
        </g>

        {/* Right Arm: Holding Cyan/Purple tablet Device */}
        <g filter="url(#purpleGlow)">
          {/* Sleeve Shoulder to hand */}
          <path d="M 152 153 C 168 158, 172 170, 164 186" fill="none" stroke="#a855f7" strokeWidth="5" strokeLinecap="round" />
          <path d="M 152 153 C 168 158, 172 170, 164 186" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5" />
          
          {/* Glowing handheld pad */}
          <g transform="translate(155, 178) rotate(-15)">
            <rect x="0" y="0" width="28" height="20" rx="2" fill="url(#purpleBaseGrad)" stroke="#d946ef" strokeWidth="1.5" />
            <rect x="0" y="0" width="28" height="20" rx="2" fill="url(#purpleGrid)" />
            {/* Glowing neon terminal blocks inside tablet */}
            <circle cx="6" cy="6" r="1.5" fill="#00ffff" />
            <line x1="11" y1="6" x2="22" y2="6" stroke="#00ffff" strokeWidth="1" />
            <line x1="6" y1="12" x2="16" y2="12" stroke="#d946ef" strokeWidth="1" />
            <circle cx="21" cy="12" r="1.5" fill="#f472b6" />
          </g>
        </g>

        {/* Left Arm resting on hip */}
        <g filter="url(#purpleGlow)">
          <path d="M 88 153 C 71 156, 68 174, 82 184" fill="none" stroke="#a855f7" strokeWidth="5" strokeLinecap="round" />
          <path d="M 88 153 C 71 156, 68 174, 82 184" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5" />
        </g>

        {/* 4. HEAD PORTRAIT COGNITION GRAPH */}
        <g filter="url(#purpleGlow)">
          {/* Cute round sphere head */}
          <circle cx="120" cy="108" r="44" fill="url(#purpleBaseGrad)" stroke="#a855f7" strokeWidth="1.8" />
          {/* Topography Grid maps */}
          <circle cx="120" cy="108" r="44" fill="url(#curvedPurpleGrid)" />

          {/* Cheeks detail */}
          <path d="M 81 116 Q 90 130, 102 122" stroke="#d946ef" strokeWidth="0.5" strokeOpacity="0.6" />
          <path d="M 159 116 Q 150 130, 138 122" stroke="#d946ef" strokeWidth="0.5" strokeOpacity="0.6" />
        </g>

        {/* COGNITIVE BIG GLOWING AI EYES (Blinking support) */}
        {!isBlinking ? (
          <g>
            {/* Outer rings */}
            <circle cx="100" cy="110" r="7" fill="rgba(217, 70, 239, 0.1)" stroke="#d946ef" strokeWidth="1" />
            <circle cx="140" cy="110" r="7" fill="rgba(217, 70, 239, 0.1)" stroke="#d946ef" strokeWidth="1" />

            {/* Glowing centers */}
            <circle cx="100" cy="110" r="4.5" fill="#ffffff" filter="url(#fuchsiaGlow)" />
            <circle cx="140" cy="110" r="4.5" fill="#ffffff" filter="url(#fuchsiaGlow)" />
            
            <circle cx="101" cy="108.5" r="1.5" fill="#d946ef" />
            <circle cx="141" cy="108.5" r="1.5" fill="#d946ef" />
          </g>
        ) : (
          <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" filter="url(#fuchsiaGlow)">
            {/* Blinking flat line */}
            <line x1="94" y1="110" x2="106" y2="110" />
            <line x1="134" y1="110" x2="146" y2="110" />
          </g>
        )}

        {/* Gentle vector smile */}
        <path d="M 112 124 Q 120 131, 128 124" fill="none" stroke="#d946ef" strokeWidth="1.8" strokeLinecap="round" filter="url(#purpleGlow)" />

        {/* 5. COGNITIVE GLOW-RING HEADPHONES */}
        <g filter="url(#ultraBright)">
          {/* Headphones top head-band arch */}
          <path d="M 78 98 Q 120 54, 162 98" fill="none" stroke="#d946ef" strokeWidth="3" strokeLinecap="round" />
          <path d="M 78 98 Q 120 54, 162 98" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.75" />

          {/* Left Earmuff */}
          <g transform="translate(67, 92) rotate(-8)">
            {/* Outer casing */}
            <rect x="0" y="0" width="12" height="28" rx="6" fill="url(#purpleBaseGrad)" stroke="#d946ef" strokeWidth="1.5" />
            {/* Neon Sound indicator side lights */}
            <rect x="3" y="4" width="6" height="20" rx="3" fill="#ffffff" stroke="#ff00ff" strokeWidth="1" className="animate-pulse" />
            {/* Connection rod */}
            <circle cx="6" cy="2" r="2.5" fill="#ffffff" />
          </g>

          {/* Right Earmuff */}
          <g transform="translate(161, 92) rotate(8)">
            {/* Outer casing */}
            <rect x="0" y="0" width="12" height="28" rx="6" fill="url(#purpleBaseGrad)" stroke="#d946ef" strokeWidth="1.5" />
            {/* Neon Sound indicator side lights */}
            <rect x="3" y="4" width="6" height="20" rx="3" fill="#ffffff" stroke="#ff00ff" strokeWidth="1" className="animate-pulse" />
            {/* Connection rod */}
            <circle cx="6" cy="2" r="2.5" fill="#ffffff" />
          </g>
        </g>

        {/* Text bottom card: "Echo AI" */}
        <g transform="translate(120, 260)">
          {/* Translucent Backdrop banner */}
          <rect x="-65" y="-1" width="130" height="23" rx="4" fill="rgba(25, 0, 45, 0.75)" stroke="#d946ef" strokeWidth="0.75" />
          
          <text 
            x="0" 
            y="10" 
            fill="#ffffff" 
            fontSize="10" 
            fontFamily="ui-sans-serif, system-ui, sans-serif" 
            fontWeight="900" 
            letterSpacing="0.06em"
            textAnchor="middle"
            filter="url(#purpleGlow)"
          >
            Echo
          </text>
          <text 
            x="0" 
            y="19" 
            fill="#d946ef" 
            fontSize="7" 
            fontFamily="monospace" 
            fontWeight="bold" 
            letterSpacing="0.1em"
            textAnchor="middle"
          >
            ECHO AI
          </text>
        </g>
      </svg>
    </div>
  );
}
