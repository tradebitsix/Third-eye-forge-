import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Line, Float, Trail, Html } from '@react-three/drei';
import * as THREE from 'three';
import { spatialAudio } from './audio/SpatialSynth';

export interface NodeData {
  position: THREE.Vector3;
  label: string;
  quote: string;
  type: string;
  healed: boolean;
  synthesizing?: boolean;
}

interface AgencyPathProps {
  nodes: NodeData[];
  onNodeInteract: (index: number) => void;
  onNodeDrop?: (index: number, pos: THREE.Vector3) => void;
  qiIntensity: number;
  qiMapEnabled?: boolean;
  onQiMapToggle?: (enabled: boolean) => void;
}

// ---------------------------------------------------------
// NODE VISUAL: Represents life trauma becoming healed agency
// ---------------------------------------------------------
function NodeVisual({ node, index, onClick, onDrop, qiIntensity }: { node: NodeData, index: number, onClick: () => void, onDrop: (idx: number, pos: THREE.Vector3) => void, qiIntensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const particlesRef = useRef<THREE.Group>(null!);
  const { controls } = useThree();

  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useMemo(() => new THREE.Plane(), []);
  const targetVec = useMemo(() => new THREE.Vector3(), []);
  const forgePos = useMemo(() => new THREE.Vector3(0, -1, -5), []);
  const [distToForge, setDistToForge] = useState(10);

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
        if (node.synthesizing) {
          // Rapid spinning and expansion pulse representing synthesis transition
          meshRef.current.rotation.y += delta * 15;
          meshRef.current.rotation.x += delta * 7;
          const scale = 1.35 + Math.sin(t * 18) * 0.3;
          meshRef.current.scale.setScalar(scale);
          // Pull towards forge core level at 0, -1, -5
          meshRef.current.position.lerp(forgePos, 0.08);
        } else if (!isDragging) {
          if (node.type === 'fear') {
             // erratic darting and rapid pulsing
             meshRef.current.position.x = node.position.x + Math.sin(t * 15) * 0.1;
             meshRef.current.position.y = node.position.y + Math.cos(t * 20) * 0.1;
             meshRef.current.position.z = node.position.z + Math.sin(t * 12) * 0.1;
             meshRef.current.scale.setScalar(1 + Math.sin(t * 10) * 0.2);
             meshRef.current.rotation.x += 0.2;
          } else if (node.type === 'regret') {
             // heavy slowly sinking/bobbing
             meshRef.current.position.y = node.position.y + Math.sin(t * 2) * 0.3 - 0.2;
             meshRef.current.rotation.y += 0.01;
          } else if (node.type === 'lesson') {
             // calm rotation
             meshRef.current.rotation.y += 0.05;
             meshRef.current.rotation.x += 0.02;
          } else {
             // trauma (default) - jittery
             meshRef.current.rotation.x += Math.random() * 0.3;
             meshRef.current.rotation.y += Math.random() * 0.3;
             meshRef.current.position.set(
                node.position.x + (Math.random() - 0.5) * 0.15,
                node.position.y + (Math.random() - 0.5) * 0.15,
                node.position.z + (Math.random() - 0.5) * 0.15
             );
          }
        } else {
          // Dragging state
          meshRef.current.rotation.x += delta;
          meshRef.current.rotation.y += delta;
          if (node.type === 'fear') meshRef.current.scale.setScalar(1);
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

    // HEALING PARTICLES: Flow dynamically towards the Central Forge
    if (node.healed && particlesRef.current) {
      particlesRef.current.children.forEach((p, i) => {
        const vel = particles[i].vel;
        
        // Attraction force towards forge (local coordinate system)
        const localForgePos = new THREE.Vector3().subVectors(forgePos, node.position);
        const dirToForge = new THREE.Vector3().subVectors(localForgePos, p.position).normalize();
        vel.add(dirToForge.multiplyScalar(delta * (30 + qiIntensity * 20)));
        
        // Spiral / vibrance based on qiIntensity
        vel.x += Math.sin(t * 15 + i) * delta * qiIntensity * 15;
        vel.y += Math.cos(t * 15 + i) * delta * qiIntensity * 15;
        vel.z += Math.sin(t * 10 + i * 2) * delta * qiIntensity * 10;
        
        // Damping
        vel.multiplyScalar(0.88);

        p.position.add(vel.clone().multiplyScalar(delta * (2 + qiIntensity)));
        p.scale.subScalar(delta * (0.15 + qiIntensity * 0.05));
        
        // Respawn to create a continuous stream
        if (p.scale.x < 0) {
           p.position.set(0, 0, 0); // Local to the particlesRef which is at node.position
           p.scale.setScalar(0.08);
           vel.set(
             (Math.random() - 0.5) * 4,
             Math.random() * 4,
             (Math.random() - 0.5) * 4
           ).normalize().multiplyScalar(Math.random() * 8 + 2);
        }
      });
    }
  });

  const bind = {
    onPointerDown: (e: any) => {
      e.stopPropagation();
      if (!node.healed) {
         spatialAudio.playInteract(meshRef.current.position, 'grab');
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
         spatialAudio.playInteract(meshRef.current.position, 'drop');
         if (controls) (controls as any).enabled = true;
         if (e.target && e.target.releasePointerCapture) {
             e.target.releasePointerCapture(e.pointerId);
         }
         onDrop(index, meshRef.current.position.clone());
      } else {
         spatialAudio.playInteract(node.position, 'drop');
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
             const dist = targetVec.distanceTo(forgePos);
             setDistToForge(dist);
             
             if (dist < 2.5) {
                 // Snap effect
                 meshRef.current.position.lerpVectors(targetVec, forgePos, 0.6);
             } else {
                 meshRef.current.position.copy(targetVec);
             }
         }
      }
    }
  };

  const getGeometry = () => {
    if (node.healed) {
      return <sphereGeometry args={[0.35, 32, 32]} />;
    }
    switch(node.type) {
      case 'regret': return <torusKnotGeometry args={[0.2, 0.08, 64, 8]} />;
      case 'fear': return <octahedronGeometry args={[0.35, 0]} />;
      case 'lesson': return <dodecahedronGeometry args={[0.3, 0]} />;
      case 'trauma':
      default:
        return <icosahedronGeometry args={[0.3, 0]} />;
    }
  };

  const getMaterialProps = () => {
    if (node.healed) {
      return { color: "#00ffcc", emissive: "#00ffcc", wireframe: false, emissiveIntensity: 1.5 };
    }
    if (node.synthesizing) {
      return { color: "#ffcc00", emissive: "#ffaa00", wireframe: false, emissiveIntensity: 2.5 };
    }
    switch(node.type) {
      case 'regret': return { color: "#5555ff", emissive: "#0000ff", wireframe: true, emissiveIntensity: 0.8 };
      case 'fear': return { color: "#ff00ff", emissive: "#aa00aa", wireframe: true, emissiveIntensity: 1.2 };
      case 'lesson': return { color: "#ffffff", emissive: "#cccccc", wireframe: true, emissiveIntensity: 0.8 };
      case 'trauma':
      default:
        return { color: "#ff0033", emissive: "#ff0000", wireframe: true, emissiveIntensity: 0.8 };
    }
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        {...bind}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = isDragging ? 'grabbing' : 'grab';
          spatialAudio.playInteract(node.position, 'hover');
        }}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {getGeometry()}
        <meshStandardMaterial
          {...getMaterialProps()}
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

      {/* Visual Feedback Line during Drag */}
      {isDragging && meshRef.current && (
        <group>
          {/* Outer Glow Line */}
          <Line 
            points={[meshRef.current.position.clone(), forgePos]} 
            color={distToForge < 2.5 ? "#00ffcc" : "#ff3333"} 
            lineWidth={distToForge < 2.5 ? 12 : 6}
            dashed 
            dashScale={20}
            transparent
            opacity={0.3}
            depthWrite={false}
            toneMapped={false}
          />
          {/* Core Line */}
          <Line 
            points={[meshRef.current.position.clone(), forgePos]} 
            color={distToForge < 2.5 ? "#ffffff" : "#ffaaaa"} 
            lineWidth={distToForge < 2.5 ? 4 : 2}
            dashed 
            dashScale={20}
            toneMapped={false}
          />
        </group>
      )}

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
// QI FLOW STREAM
// ---------------------------------------------------------
function QiParticle({ p, i, points, qiIntensity, color, activeNodeType }: any) {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  let targetColor = color;
  if (activeNodeType === 'fear') {
      targetColor = '#ff00ff';
  } else if (activeNodeType === 'regret') {
      targetColor = '#5555ff';
  } else if (activeNodeType === 'trauma') {
      targetColor = '#ff0033';
  }
  
  useFrame((state, delta) => {
    if (meshRef.current && points.length > 0) {
      let speedMultiplier = 1;
      let jitterScale = 0;
      let yOffsetScale = 0.1;
      let scaleBase = 0.5;
      let scaleJitter = 0.2;
      
      if (activeNodeType === 'fear') {
          speedMultiplier = 1.8;
          jitterScale = 0.3;
          yOffsetScale = 0.4;
          scaleBase = 0.3;
          scaleJitter = 0.4;
      } else if (activeNodeType === 'regret') {
          speedMultiplier = 0.25;
          jitterScale = 0.02;
          yOffsetScale = -0.05;
          scaleBase = 0.8;
          scaleJitter = 0.05;
      } else if (activeNodeType === 'trauma') {
          speedMultiplier = 0.7;
          jitterScale = 0.25;
          yOffsetScale = 0.25;
          scaleBase = 0.4;
          scaleJitter = 0.6;
      }

      p.progress += delta * 0.1 * qiIntensity * p.speedOffset * speedMultiplier;
      if (p.progress > 1) p.progress -= 1;
      
      const idx = p.progress * (points.length - 1);
      const i0 = Math.floor(idx);
      const i1 = Math.min(i0 + 1, points.length - 1);
      const t = idx - i0;

      const mesh = meshRef.current;
      mesh.position.lerpVectors(points[i0], points[i1], t);
      
      if (activeNodeType === 'fear') {
          mesh.position.x += Math.sin(state.clock.elapsedTime * 20 * p.speedOffset + i * 1.5) * jitterScale * qiIntensity;
          mesh.position.y += Math.cos(state.clock.elapsedTime * 25 * p.speedOffset + i * 2) * yOffsetScale * qiIntensity;
          mesh.position.z += Math.sin(state.clock.elapsedTime * 15 * p.speedOffset + i * 3) * jitterScale * qiIntensity;
      } else if (activeNodeType === 'trauma') {
          mesh.position.x += (Math.random() - 0.5) * jitterScale * qiIntensity;
          mesh.position.y += (Math.random() - 0.5) * yOffsetScale * qiIntensity;
          mesh.position.z += (Math.random() - 0.5) * jitterScale * qiIntensity;
          if (Math.random() > 0.85) {
              mesh.scale.setScalar(0.05); 
          } else {
              mesh.scale.setScalar(scaleBase + qiIntensity * 0.2);
          }
      } else if (activeNodeType === 'regret') {
          mesh.position.y += Math.sin(state.clock.elapsedTime * 2 * p.speedOffset + i) * yOffsetScale * qiIntensity;
      } else {
          mesh.position.y += Math.sin(state.clock.elapsedTime * 10 * p.speedOffset + i) * yOffsetScale * qiIntensity;
      }

      const material = mesh.material as THREE.MeshBasicMaterial;
      
      if (activeNodeType !== 'trauma') {
          mesh.scale.setScalar(scaleBase + qiIntensity * 0.2 + Math.sin(state.clock.elapsedTime * 5 + i) * scaleJitter);
      }
      
      if (activeNodeType === 'fear') {
          material.color.setHex(0xff00ff);
          material.opacity = 0.8;
      } else if (activeNodeType === 'regret') {
          material.color.setHex(0x5555ff);
          material.opacity = 0.9;
      } else if (activeNodeType === 'trauma') {
          material.color.setHex(0xff0033);
          material.opacity = Math.random() > 0.5 ? 0.3 : 0.9;
      } else {
          material.color.set(color);
          material.opacity = 0.6;
      }
    }
  });

  // Calculate dynamic trail color and length based on qiIntensity (typical range: 0.5 to 5.0)
  const baseColorObj = new THREE.Color(targetColor);
  
  // Transition towards a brighter, more radiant version of the color as qiIntensity increases
  const highlightColorObj = new THREE.Color(
    activeNodeType === 'fear' ? '#ff99ff' :
    activeNodeType === 'regret' ? '#a3a3ff' :
    activeNodeType === 'trauma' ? '#ff6688' :
    '#ffffff'
  );
  
  const factor = Math.max(0, Math.min(1, (qiIntensity - 0.5) / 4.5));
  baseColorObj.lerp(highlightColorObj, factor);
  const trailColor = `#${baseColorObj.getHexString()}`;

  return (
    <Trail
      width={0.4 * (0.5 + qiIntensity * 0.1)}
      length={20}
      color={trailColor}
      attenuation={(t) => t * t} // Width attenuation gives it a comet-like trail
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} color={trailColor} />
      </mesh>
    </Trail>
  );
}

function QiFlowStream({ points, qiIntensity, color, activeNodeType }: { points: THREE.Vector3[], qiIntensity: number, color: string, activeNodeType?: string }) {
  const count = 30; // Number of particles flowing

  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      progress: (i / count), // Start at staggered positions
      speedOffset: Math.random() * 0.5 + 0.5, // Slight varied speed
    }));
  }, [count]);

  return (
    <group>
      {particles.map((p, i) => (
        <QiParticle key={i} p={p} i={i} points={points} qiIntensity={qiIntensity} color={color} activeNodeType={activeNodeType} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------
// QI MAP VECTOR FIELD GRID OVERLAY
// ---------------------------------------------------------
function QiMapGrid({ nodes, qiIntensity }: { nodes: NodeData[], qiIntensity: number }) {
  const lineSegmentsRef = useRef<THREE.LineSegments>(null!);
  const forgePos = useMemo(() => new THREE.Vector3(0, -1, -5), []);

  // Grid point coordinates on the floor plane
  const gridPositions = useMemo(() => {
    const arr = [];
    // Spans from X = -16 to 16, Z = -16 to 16 in steps of 2
    for (let x = -16; x <= 16; x += 2) {
      for (let z = -16; z <= 16; z += 2) {
        arr.push(new THREE.Vector3(x, -0.96, z));
      }
    }
    return arr;
  }, []);

  const pointCount = gridPositions.length;

  // Float arrays for rendering line segments
  const { positions, colors } = useMemo(() => {
    // Each grid point has 1 segment (2 vertices: start and end position)
    const positions = new Float32Array(pointCount * 2 * 3);
    const colors = new Float32Array(pointCount * 2 * 3);
    return { positions, colors };
  }, [pointCount]);

  useFrame((state) => {
    if (!lineSegmentsRef.current) return;
    const time = state.clock.elapsedTime;
    const numPoints = gridPositions.length;
    const posAttr = lineSegmentsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = lineSegmentsRef.current.geometry.attributes.color as THREE.BufferAttribute;

    const baseColor = new THREE.Color('#00e1ff');
    const accentNodeColor = new THREE.Color('#ff0055');
    const inactiveColor = new THREE.Color('#002233');

    for (let i = 0; i < numPoints; i++) {
      const base = gridPositions[i];
      const idx = i * 6; // 6 floats per line segment: 2 vertices * 3 coordinates (x, y, z)

      // Compute vector field forces at this specific floor node position
      const flow = new THREE.Vector3();

      // Vector attraction towards Central Forge Core
      const toForge = forgePos.clone().sub(base);
      const distForge = toForge.length();
      // Gravitational force pull scaling with distance
      flow.addScaledVector(toForge.normalize(), 0.95 / (distForge + 1.0));

      // Vector repulsion / attraction flows from unhealed / healed memory nodes
      let nearestUnhealedDist = 999;
      nodes.forEach(node => {
        const toNode = node.position.clone().sub(base);
        // Project onto floor plane, ignoring altitude
        toNode.y = 0;
        const distNode = toNode.length();

        // Healed nodes draw the energy in, unhealed nodes act as turbulent obstacles
        const influence = (node.healed ? 0.9 : -1.3) * (qiIntensity * 0.4 + 0.6) / (distNode * distNode + 0.5);
        flow.addScaledVector(toNode.normalize(), influence);

        if (!node.healed && distNode < nearestUnhealedDist) {
          nearestUnhealedDist = distNode;
        }
      });

      // Wave fluctuation over time (undulation)
      const waveAngle = time * 1.2 + base.x * 0.2 + base.z * 0.2;
      flow.x += Math.sin(waveAngle) * 0.3;
      flow.z += Math.cos(waveAngle) * 0.3;

      // Pulse length multiplier by current dynamic sound/visual intensity
      flow.multiplyScalar(0.42 * (1.0 + qiIntensity * 0.18));

      // Limit max line extent to keep the visual spacing clean and sharp
      const maxLength = 1.35;
      if (flow.length() > maxLength) {
        flow.setLength(maxLength);
      }

      // Vertex A: Grid intersection base
      positions[idx] = base.x;
      positions[idx + 1] = base.y;
      positions[idx + 2] = base.z;

      // Vertex B: Vector endpoint location
      positions[idx + 3] = base.x + flow.x;
      positions[idx + 4] = base.y + flow.y;
      positions[idx + 5] = base.z + flow.z;

      // Dynamically shift color spectrum depending on proximity to turbulent sources
      const startGlow = baseColor.clone();
      if (nearestUnhealedDist < 4.0) {
        // Warning heat map coloring around active trauma particles
        startGlow.lerp(accentNodeColor, Math.max(0, 1 - (nearestUnhealedDist / 4.0)));
      } else if (qiIntensity > 2.0) {
        // Flare energy wave shifts theme colors
        startGlow.lerp(new THREE.Color('#ff00ff'), Math.min(1.0, (qiIntensity - 2.0) / 3.0));
      }

      // Visual gradient flow: Glowing starting head, fading into dark deep space tail
      colors[idx] = startGlow.r;
      colors[idx + 1] = startGlow.g;
      colors[idx + 2] = startGlow.b;

      colors[idx + 3] = inactiveColor.r;
      colors[idx + 4] = inactiveColor.g;
      colors[idx + 5] = inactiveColor.b;
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* 3D Line Grid Calculations */}
      <lineSegments ref={lineSegmentsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.4}
          linewidth={1}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>

      {/* Decorative Base Coordinate Anchors */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(gridPositions.flatMap(p => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color="#00ffe1"
          transparent
          opacity={0.25}
          sizeAttenuation
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

// ---------------------------------------------------------
// MAIN PATH MANAGER
// ---------------------------------------------------------
export default function AgencyPath({ nodes, onNodeInteract, onNodeDrop, qiIntensity, qiMapEnabled, onQiMapToggle }: AgencyPathProps) {
  const lineRef = useRef<any>(null);

  const [localQiMap, setLocalQiMap] = useState(false);
  const showQiMap = qiMapEnabled !== undefined ? qiMapEnabled : localQiMap;

  // Dynamic Curve representing the life timeline
  const curve = useMemo(() => {
    const pts = nodes.map(n => n.position);
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  }, [nodes]);

  const numHealed = nodes.filter(n => n.healed).length;
  const allHealed = numHealed === nodes.length;
  const activeUnhealedNode = nodes.find(n => !n.healed);

  // Knot Insertion Mechanic (Boehm’s algorithm made visible): 
  // As trauma becomes agency, resolution increases, jitter dies, path smooths.
  const points = useMemo(() => {
    const resolution = numHealed > 5 ? 40 + numHealed * 120 : 20 + numHealed * 80; 
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

  const handleToggleQiMap = () => {
    if (onQiMapToggle) {
      onQiMapToggle(!showQiMap);
    } else {
      setLocalQiMap(prev => !prev);
    }
  };

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

      {/* Qi Energy Flowing through the Path */}
      <QiFlowStream points={points} qiIntensity={qiIntensity} color={allHealed ? "#ffffff" : "#00ffcc"} activeNodeType={activeUnhealedNode?.type} />

      {isRoofLeapActive && (
         <Line points={roofLeapArc} color="#ffff00" lineWidth={4} dashed dashScale={10} opacity={0.6} transparent />
      )}
      
      {/* Tuck and Roll Avatar Animation */}
      {roofNode && <RoofLeapAvatar arcPoints={roofLeapArc} active={!!isRoofLeapHealed} />}

      {/* Map Nodes */}
      {nodes.map((node, i) => (
        <NodeVisual key={i} node={node} index={i} onClick={() => onNodeInteract(i)} onDrop={onNodeDrop || (() => {})} qiIntensity={qiIntensity} />
      ))}

      {/* Central Agency Pillar & Wealth Fortress */}
      <AgencyPillar nodes={nodes} qiIntensity={qiIntensity} />

      {/* Dynamic Floor Vector Field Grid Overlay when Active */}
      {showQiMap && (
        <QiMapGrid nodes={nodes} qiIntensity={qiIntensity} />
      )}

      {/* Embedded Floating Screen Toggle button for immediate standalone access */}
      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <div className="absolute bottom-24 left-6 z-20 pointer-events-auto flex flex-col items-start gap-1">
          <button
            onClick={handleToggleQiMap}
            className={`px-4 py-2 border font-mono text-[10px] md:text-xs uppercase tracking-widest backdrop-blur-md transition-all active:scale-95 duration-200 rounded shadow-[0_0_15px_rgba(0,255,180,0.1)] ${
              showQiMap 
                ? 'bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc] shadow-[0_0_20px_rgba(0,255,204,0.3)] font-semibold' 
                : 'bg-black/60 border-cyan-500/20 text-cyan-400/70 hover:text-cyan-300 hover:border-cyan-400/55'
            }`}
          >
            [ {showQiMap ? 'Qi Map: Active' : 'Qi Map: Off'} ]
          </button>
        </div>
      </Html>
    </group>
  );
}
