import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Line, Float } from '@react-three/drei';
import * as THREE from 'three';

export interface NodeData {
  position: THREE.Vector3;
  label: string;
  quote: string;
  type: 'escape' | 'roof' | 'rebuild';
  healed: boolean;
}

interface AgencyPathProps {
  nodes: NodeData[];
  onNodeInteract: (index: number) => void;
}

// ---------------------------------------------------------
// NODE VISUAL: Represents life trauma becoming healed agency
// ---------------------------------------------------------
function NodeVisual({ node, onClick }: { node: NodeData, onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const particlesRef = useRef<THREE.Group>(null!);

  // Pre-generate particle initial velocities for the healing burst
  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map(() => ({
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(Math.random() * 2 + 1)
    }));
  }, []);

  // Pre-generate the trajectory logic for the "Roof Leap Arc"
  const roofLeapArc = useMemo(() => {
    const pts = [];
    if (node.type === 'roof') {
      // Calculate Leap, Tuck, Roll (Parabolic arc)
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        pts.push(new THREE.Vector3(t * 2, Math.sin(t * Math.PI) * 1.5, 0));
      }
    }
    return pts;
  }, [node.type]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (!node.healed) {
        // BATTLE WOUND: Unhealed trauma is a cracked, chaotic, jittery mesh
        meshRef.current.rotation.x += Math.random() * 0.2;
        meshRef.current.rotation.y += Math.random() * 0.2;
        meshRef.current.position.set(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        );
      } else {
        // HEALED: Smooth rotation, centers beautifully into alignment
        meshRef.current.position.lerp(new THREE.Vector3(0, 0, 0), 0.1);
        meshRef.current.rotation.y += delta * 1.5;
        meshRef.current.rotation.x += delta * 0.5;
      }
    }

    // HEALING PARTICLES: Shatter and expand on agency unlock
    if (node.healed && particlesRef.current) {
      particlesRef.current.children.forEach((p, i) => {
        const vel = particles[i].vel;
        p.position.add(vel.clone().multiplyScalar(delta));
        p.scale.subScalar(delta * 0.4);
        if (p.scale.x < 0) p.scale.set(0, 0, 0); // Disappear
      });
    }
  });

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {node.healed ? (
          <icosahedronGeometry args={[0.3, 4]} /> // Smooth high-poly curve
        ) : (
          <icosahedronGeometry args={[0.3, 0]} /> // Jagged low-poly wound
        )}
        <meshStandardMaterial
          color={node.healed ? "#00ffcc" : "#ff0033"}
          wireframe={!node.healed}
          emissive={node.healed ? "#00ffcc" : "#330000"}
          emissiveIntensity={node.healed ? 0.8 : 0.4}
        />
      </mesh>

      {/* Particle Healing Burst */}
      {node.healed && (
        <group ref={particlesRef}>
          {particles.map((_, pi) => (
            <mesh key={pi}>
              <sphereGeometry args={[0.04]} />
              <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
            </mesh>
          ))}
        </group>
      )}

      {/* Roof Leap Arc Visualization */}
      {node.healed && node.type === 'roof' && (
        <group position={[-1, 0, 0]}>
          <Line points={roofLeapArc} color="#ffff00" lineWidth={3} dashed dashScale={10} />
          <Text position={[1, 1.8, 0]} fontSize={0.15} color="#ffff00">
            CALCULATE LEAP. TUCK. ROLL.
          </Text>
        </group>
      )}

      {/* Text Labels & Spatial Audio Hints */}
      <Text position={[0, 1.2, 0]} fontSize={0.3} color={node.healed ? "#00ffcc" : "#ffdddd"} anchorX="center">
        {node.label}
      </Text>

      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.2}
          color={node.healed ? "#ffffff" : "#aa3333"}
          opacity={node.healed ? 1 : 0.8}
          transparent
        >
          {node.quote}
        </Text>
        {node.healed && (
          <Text position={[0, -1.1, 0]} fontSize={0.12} color="#00ffcc">
            [Spatial Audio: "I Control Me • Be Like Water"]
          </Text>
        )}
      </Float>
    </group>
  );
}

// ---------------------------------------------------------
// WEALTH FORTRESS: Expanding legacy cash value beyond the trauma
// ---------------------------------------------------------
function WealthFortressVisual({ active }: { active: boolean }) {
  const cashValueRef = useRef<THREE.Mesh>(null!);
  const loanRef = useRef<THREE.Mesh>(null!);

  const cashScale = useRef(0);
  const loanScale = useRef(0);

  useFrame((state, delta) => {
    if (!active) return;
    
    // Core concept: Cash value continuously compounds even if a loan is drawn.
    cashScale.current += delta * 0.4;
    
    // The policy loan is deployed for life moves.
    if (cashScale.current > 1) {
      loanScale.current = THREE.MathUtils.lerp(loanScale.current, cashScale.current * 0.6, 0.05);
    }

    if (cashValueRef.current) {
      cashValueRef.current.scale.y = cashScale.current;
      cashValueRef.current.position.y = cashScale.current / 2;
    }
    if (loanRef.current) {
      loanRef.current.scale.y = loanScale.current;
      loanRef.current.position.y = loanScale.current / 2;
    }
  });

  if (!active) return null;

  return (
    <group position={[5, -1, 2]}>
      <Text position={[0, 4.0, 0]} fontSize={0.3} color="#66ff66">WEALTH FORTRESS: GENERATIONAL FLOW</Text>
      
      {/* HUD Labels for Financial Agency */}
      <Text position={[0, 3.5, 0]} fontSize={0.18} color="#ffffff">Cash Value Compounding (Crediting Rate &gt; Loan Rate)</Text>
      <Text position={[2.5, 3.5, 0]} fontSize={0.18} color="#00ccff">Policy Loan Active for Life Move</Text>

      {/* Base Cash Value Bar */}
      <mesh ref={cashValueRef} position={[0, 0, 0]}>
        <boxGeometry args={[1.2, 1, 1.2]} />
        <meshStandardMaterial color="#66ff66" emissive="#116611" transparent opacity={0.9} />
      </mesh>

      {/* Loan Representation Bar */}
      <mesh ref={loanRef} position={[2.5, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#00ccff" emissive="#003366" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------
// MAIN PATH MANAGER
// ---------------------------------------------------------
export default function AgencyPath({ nodes, onNodeInteract }: AgencyPathProps) {
  const lineRef = useRef<any>(null);

  // Dynamic Curve representing the life timeline
  const curve = useMemo(() => {
    const pts = nodes.map(n => n.position);
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  }, [nodes]);

  const numHealed = nodes.filter(n => n.healed).length;
  const allHealed = numHealed === nodes.length;

  // Knot Insertion Mechanic (Boehm’s algorithm made visible): 
  // As trauma becomes agency, resolution increases, jitter dies, path smooths.
  const points = useMemo(() => {
    const resolution = 20 + numHealed * 80; 
    return curve.getPoints(resolution);
  }, [curve, numHealed]);

  useFrame((state) => {
    if (lineRef.current) {
      // Curve breathing/flow
      lineRef.current.material.dashOffset -= 0.01;
    }
  });

  return (
    <group>
      {/* Main Agency Path Curve */}
      <Line
        ref={lineRef}
        points={points}
        color={allHealed ? "#00ffcc" : "#669999"}
        lineWidth={allHealed ? 8 : 4}
        dashed={true}
        dashScale={50}
        dashSize={1}
        dashOffset={0}
        transparent
        opacity={0.8}
      />

      {/* Map Nodes */}
      {nodes.map((node, i) => (
        <NodeVisual key={i} node={node} onClick={() => onNodeInteract(i)} />
      ))}

      {/* Post-Resolution Wealth Engine */}
      <WealthFortressVisual active={allHealed} />
    </group>
  );
}
