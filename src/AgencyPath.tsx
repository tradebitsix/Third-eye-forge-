import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Line, Float } from '@react-three/drei';
import * as THREE from 'three';

export interface NodeData {
  position: THREE.Vector3;
  label: string;
  quote: string;
  type: 'escape' | 'roof' | 'rebuild' | 'trauma';
  healed: boolean;
}

interface AgencyPathProps {
  nodes: NodeData[];
  onNodeInteract: (index: number) => void;
  onNodeDrop?: (index: number, pos: THREE.Vector3) => void;
  qiIntensity: number;
}

// ---------------------------------------------------------
// NODE VISUAL: Represents life trauma becoming healed agency
// ---------------------------------------------------------
function NodeVisual({ node, index, onClick, onDrop }: { node: NodeData, index: number, onClick: () => void, onDrop: (idx: number, pos: THREE.Vector3) => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const particlesRef = useRef<THREE.Group>(null!);
  const { controls } = useThree();

  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useMemo(() => new THREE.Plane(), []);
  const targetVec = useMemo(() => new THREE.Vector3(), []);

  // Stitches for unhealed trauma nodes (like the 75 stitches)
  const stitches = useMemo(() => {
    return Array.from({ length: 15 }).map(() => ({
      pos: new THREE.Vector3((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35),
      rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    }));
  }, []);

  // Pre-generate particle initial velocities for the healing burst
  const particles = useMemo(() => {
    return Array.from({ length: 150 }).map(() => ({
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(Math.random() * 6 + 2)
    }));
  }, []);

  const timeOffset = useMemo(() => Math.random() * 10, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime + timeOffset;

    if (meshRef.current) {
      if (!node.healed) {
        if (!isDragging) {
          // BATTLE WOUND: Unhealed trauma is a cracked, chaotic, jittery mesh
          meshRef.current.rotation.x += Math.random() * 0.3;
          meshRef.current.rotation.y += Math.random() * 0.3;
          meshRef.current.position.set(
            node.position.x + (Math.random() - 0.5) * 0.15,
            node.position.y + (Math.random() - 0.5) * 0.15,
            node.position.z + (Math.random() - 0.5) * 0.15
          );
        } else {
          // Dragging state
          meshRef.current.rotation.x += delta;
          meshRef.current.rotation.y += delta;
        }
      } else {
        // HEALED: Smooth rotation, centers beautifully into alignment
        meshRef.current.position.lerp(node.position, 0.1);
        meshRef.current.rotation.y += delta * 0.5;
        meshRef.current.rotation.x += delta * 0.2;
        const scale = 1 + Math.sin(t * 3) * 0.05;
        meshRef.current.scale.setScalar(scale);
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

  const bind = {
    onPointerDown: (e: any) => {
      e.stopPropagation();
      if (!node.healed) {
         setIsDragging(true);
         if (controls) (controls as any).enabled = false;
         // capture pointer for reliable dragging
         if (e.target && e.target.setPointerCapture) {
            e.target.setPointerCapture(e.pointerId);
         }
      }
    },
    onPointerUp: (e: any) => {
      e.stopPropagation();
      if (isDragging) {
         setIsDragging(false);
         if (controls) (controls as any).enabled = true;
         if (e.target && e.target.releasePointerCapture) {
             e.target.releasePointerCapture(e.pointerId);
         }
         onDrop(index, meshRef.current.position.clone());
      } else {
         onClick(); 
      }
    },
    onPointerMove: (e: any) => {
      if (isDragging) {
         e.stopPropagation();
         // Construct a plane facing the camera, passing through the original node Z
         dragPlane.setFromNormalAndCoplanarPoint(
             e.camera.getWorldDirection(new THREE.Vector3()).negate(), 
             new THREE.Vector3(0,0,node.position.z)
         );
         if (e.ray.intersectPlane(dragPlane, targetVec)) {
             meshRef.current.position.copy(targetVec);
         }
      }
    }
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        {...bind}
        onPointerOver={() => (document.body.style.cursor = isDragging ? 'grabbing' : 'grab')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {node.healed ? (
          <icosahedronGeometry args={[0.35, 4]} /> // Smooth high-poly curve for strong memory
        ) : (
          <icosahedronGeometry args={[0.3, 0]} /> // Jagged low-poly wound for trauma
        )}
        <meshStandardMaterial
          color={node.healed ? "#00ffcc" : "#ff0033"}
          wireframe={!node.healed}
          emissive={node.healed ? "#00ffcc" : "#ff0000"}
          emissiveIntensity={node.healed ? 1.5 : 0.8}
          toneMapped={false}
        />
        
        {/* Render Stitches if not healed */}
        {!node.healed && stitches.map((s, i) => (
          <mesh key={i} position={s.pos} rotation={s.rot}>
            <cylinderGeometry args={[0.015, 0.015, 0.15]} />
            <meshBasicMaterial color="#ff3333" toneMapped={false} />
          </mesh>
        ))}
      </mesh>

      {/* Particle Healing Burst */}
      {node.healed && (
        <group ref={particlesRef} position={node.position}>
          {particles.map((_, pi) => (
            <mesh key={pi}>
              <boxGeometry args={[0.08, 0.08, 0.08]} />
              <meshBasicMaterial color="#00ffcc" transparent opacity={0.9} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}

      {/* Text Labels & Spatial Audio Hints */}
      <Text position={[node.position.x, node.position.y + 0.8, node.position.z]} fontSize={0.25} color={node.healed ? "#00ffcc" : "#ffdddd"} anchorX="center">
        {node.label}
      </Text>

      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Text
          position={[node.position.x, node.position.y - 0.6, node.position.z]}
          fontSize={0.16}
          color={node.healed ? "#ffffff" : "#aa3333"}
          fillOpacity={node.healed ? 1 : 0.8}
        >
          {node.quote}
        </Text>
        {node.healed && (
          <Text position={[node.position.x, node.position.y - 0.85, node.position.z]} fontSize={0.12} color="#00ffcc">
            [Stable Memory: Clear & Strong]
          </Text>
        )}
      </Float>
    </group>
  );
}

function RoofLeapAvatar({ arcPoints, active }: { arcPoints: THREE.Vector3[], active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [progress, setProgress] = useState(-1);

  useEffect(() => {
     if (active && progress === -1) {
       setProgress(0); // Trigger the leap!
     }
  }, [active]);

  useFrame((state, delta) => {
    if (progress >= 0 && progress < 1) {
       setProgress(p => Math.min(p + delta * 0.6, 1));
    }
    if (meshRef.current && progress >= 0 && progress < 1 && arcPoints.length > 0) {
       const idx = progress * (arcPoints.length - 1);
       const i0 = Math.floor(idx);
       const i1 = Math.min(i0 + 1, arcPoints.length - 1);
       const t = idx - i0;
       meshRef.current.position.lerpVectors(arcPoints[i0], arcPoints[i1], t);
       meshRef.current.rotation.x -= delta * 20; // Fast Forward Tuck and roll
    }
  });

  if (progress < 0 || progress >= 1) return null;

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[0.3, 2]} />
      <meshStandardMaterial color="#ffff00" emissive="#aa8800" emissiveIntensity={2} wireframe toneMapped={false} />
    </mesh>
  );
}

// ---------------------------------------------------------
// CENTRAL AGENCY BAR / WEALTH FORTRESS
// ---------------------------------------------------------
function AgencyPillar({ nodes, qiIntensity }: { nodes: NodeData[], qiIntensity: number }) {
  const pillarRef = useRef<THREE.Mesh>(null!);
  const wealthGroupRef = useRef<THREE.Group>(null!);

  const allHealed = nodes.every(n => n.healed);
  const activeUnhealedNode = nodes.find(n => !n.healed);
  
  // Is the user on the roof leap node?
  const isRoofLeap = activeUnhealedNode?.type === 'roof';

  const cashScale = useRef(0);
  const loanScale = useRef(0);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    if (pillarRef.current) {
      if (allHealed) {
        // Transform into Wealth Fortress base
        pillarRef.current.scale.y = THREE.MathUtils.lerp(pillarRef.current.scale.y, 0, 0.05);
        (pillarRef.current.material as THREE.MeshStandardMaterial).color.set("#66ff66");
        (pillarRef.current.material as THREE.MeshStandardMaterial).emissive.set("#116611");
      } else {
        // Vertical "Agency Asserted" bar pulses with Qi Sway
        const baseHeight = 5;
        const pulse = Math.sin(time * 2) * 0.5 * qiIntensity;
        pillarRef.current.scale.y = THREE.MathUtils.lerp(pillarRef.current.scale.y, baseHeight + pulse, 0.1);
        pillarRef.current.position.y = pillarRef.current.scale.y / 2 - 1.5; // Rise from grid

        // If roof leap, steepen the pitch (shear/rotate the pillar temporarily)
        if (isRoofLeap) {
          pillarRef.current.rotation.z = THREE.MathUtils.lerp(pillarRef.current.rotation.z, -Math.PI / 6, 0.05);
          (pillarRef.current.material as THREE.MeshStandardMaterial).color.set("#ffff00");
          (pillarRef.current.material as THREE.MeshStandardMaterial).emissive.set("#444400");
        } else {
          pillarRef.current.rotation.z = THREE.MathUtils.lerp(pillarRef.current.rotation.z, 0, 0.05);
          // Pulse green if healing was recently triggered (qiIntensity > 1)
          if (qiIntensity > 1.2) {
             (pillarRef.current.material as THREE.MeshStandardMaterial).color.set("#00ffcc");
             (pillarRef.current.material as THREE.MeshStandardMaterial).emissive.set("#00ffcc");
          } else {
             (pillarRef.current.material as THREE.MeshStandardMaterial).color.set("#00cccc");
             (pillarRef.current.material as THREE.MeshStandardMaterial).emissive.set("#002222");
          }
        }
      }
    }

    if (allHealed && wealthGroupRef.current) {
       cashScale.current += delta * 0.4;
       if (cashScale.current > 1) {
         loanScale.current = THREE.MathUtils.lerp(loanScale.current, cashScale.current * 0.6, 0.05);
       }
       
       const cashBar = wealthGroupRef.current.children[0] as THREE.Mesh;
       const loanBar = wealthGroupRef.current.children[1] as THREE.Mesh;
       
       if (cashBar) {
         cashBar.scale.y = cashScale.current;
         cashBar.position.y = cashScale.current / 2;
       }
       if (loanBar) {
         loanBar.scale.y = loanScale.current;
         loanBar.position.y = loanScale.current / 2;
       }
    }
  });

  return (
    <group position={[0, -1, -5]}>
       {/* Central Agency Pillar */}
       <mesh ref={pillarRef}>
         <cylinderGeometry args={[0.2, 0.2, 1, 16]} />
         <meshStandardMaterial color="#00cccc" emissive="#002222" emissiveIntensity={1} />
       </mesh>
       
       {!allHealed && (
          <Text position={[0, 4, 0]} fontSize={0.2} color="#00ffcc" anchorY="bottom">
            || CENTRAL FORGE ||
          </Text>
       )}

       {/* Wealth Fortress Visuals */}
       <group ref={wealthGroupRef} visible={allHealed} position={[-1, 0, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.2, 1, 1.2]} />
            <meshStandardMaterial color="#66ff66" emissive="#116611" transparent opacity={0.9} />
          </mesh>
          <mesh position={[2.5, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#00ccff" emissive="#003366" transparent opacity={0.8} />
          </mesh>
          
          <Text position={[1.25, 4.0, 0]} fontSize={0.3} color="#66ff66">WEALTH FORTRESS: GENERATIONAL FLOW</Text>
          <Text position={[0, 3.5, 0]} fontSize={0.16} color="#ffffff" anchorX="center">Cash Value Compounding (Crediting Rate &gt; Loan Rate)</Text>
          <Text position={[2.5, 3.5, 0]} fontSize={0.16} color="#00ccff" anchorX="center">Policy Loan Active for Life Move</Text>
       </group>
    </group>
  );
}

// ---------------------------------------------------------
// MAIN PATH MANAGER
// ---------------------------------------------------------
export default function AgencyPath({ nodes, onNodeInteract, onNodeDrop, qiIntensity }: AgencyPathProps) {
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

  // Roof leap Arc logic
  const roofNode = nodes.find(n => n.type === 'roof');
  const isRoofLeapActive = roofNode && !roofNode.healed;
  const isRoofLeapHealed = roofNode && roofNode.healed;
  
  const roofLeapArc = useMemo(() => {
    const pts = [];
    if (roofNode) {
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        // Parabolic arc for tuck and roll
        pts.push(new THREE.Vector3(
           roofNode.position.x + t * 4, 
           roofNode.position.y + Math.sin(t * Math.PI) * 2.5, 
           roofNode.position.z - t * 2
        ));
      }
    }
    return pts;
  }, [roofNode]);

  useFrame((state) => {
    if (lineRef.current) {
      // Curve breathing/flow based on Qi
      lineRef.current.material.dashOffset -= 0.01 * qiIntensity;
    }
  });

  return (
    <group>
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

      {isRoofLeapActive && (
         <Line points={roofLeapArc} color="#ffff00" lineWidth={4} dashed dashScale={10} opacity={0.6} transparent />
      )}
      
      {/* Tuck and Roll Avatar Animation */}
      {roofNode && <RoofLeapAvatar arcPoints={roofLeapArc} active={!!isRoofLeapHealed} />}

      {/* Map Nodes */}
      {nodes.map((node, i) => (
        <NodeVisual key={i} node={node} index={i} onClick={() => onNodeInteract(i)} onDrop={onNodeDrop || (() => {})} />
      ))}

      {/* Central Agency Pillar & Wealth Fortress */}
      <AgencyPillar nodes={nodes} qiIntensity={qiIntensity} />
    </group>
  );
}
