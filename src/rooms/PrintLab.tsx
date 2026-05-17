import React, { useState, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text, Grid, PivotControls } from '@react-three/drei';
import * as THREE from 'three';
import { GoogleGenAI } from '@google/genai';

interface PrintSpec {
  partName: string;
  dimensions: { x: number, y: number, z: number };
  material: string;
  infill: string;
  layerHeight: string;
  estimatedTime: string;
  notes: string;
}

function PrinterBed() {
  return (
    <group position={[0, -0.01, 0]}>
      <Grid infiniteGrid fadeDistance={20} sectionColor="#2a2a35" cellColor="#111115" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#0a0a0c" />
      </mesh>
      {/* Grid lines for Labists bed (typically ~ 120x120mm to 220x220mm, let's represent 1 unit = 10mm) */}
      <gridHelper args={[22, 22, '#444455', '#222233']} position={[0, 0.01, 0]} />
      <Text position={[11, 0.05, 11]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#556" anchorX="right" anchorY="bottom">
        LABISTS X1 / ET4 BED
      </Text>
    </group>
  );
}

function GeneratedObject({ activePrint, imagePreview }: { activePrint: PrintSpec | null, imagePreview: string | null }) {
  const meshRef = useRef<THREE.Group>(null!);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  React.useEffect(() => {
    if (imagePreview) {
      new THREE.TextureLoader().load(imagePreview, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      });
    } else {
      setTexture(null);
    }
  }, [imagePreview]);

  useFrame((state) => {
    if (meshRef.current && activePrint && !isDragging) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  if (!activePrint) return null;

  // Bounding box of the part
  const activeDims = activePrint.dimensions || { x: 100, y: 100, z: 100 };
  const x = activeDims.x || 100;
  const y = activeDims.y || 100;
  const z = activeDims.z || 100;
  
  // Transform mm to units (1 unit = 10mm)
  const scaleX = x / 10;
  const scaleY = y / 10;
  const scaleZ = z / 10;

  // Determine aspect ratio for the image texture
  let texScaleX = scaleX;
  let texScaleY = scaleY;
  if (texture && texture.image) {
    const width = (texture.image as any).width || 1;
    const height = (texture.image as any).height || 1;
    const aspect = width / height;
    if (aspect > 1) {
       texScaleY = scaleX / aspect;
    } else {
       texScaleX = scaleY * aspect;
    }
  }

  return (
    <PivotControls
      scale={2}
      activeAxes={[true, true, true]}
      depthTest={false}
      lineWidth={3}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
    >
      <group position={[0, scaleY / 2, 0]} ref={meshRef}>
        {/* Center Image / Model */}
        {texture ? (
          <group>
            {/* Main display facing forward */}
            <mesh position={[0, 0, (scaleZ * 0.9) / 2]}>
              <planeGeometry args={[texScaleX * 0.9, texScaleY * 0.9]} />
              <meshStandardMaterial 
                map={texture} 
                alphaTest={0.5}
                transparent={false}
                side={THREE.DoubleSide}
                roughness={0.3}
                metalness={0.2}
              />
            </mesh>
            {/* Back display */}
            <mesh position={[0, 0, -(scaleZ * 0.9) / 2]}>
              <planeGeometry args={[texScaleX * 0.9, texScaleY * 0.9]} />
              <meshStandardMaterial 
                map={texture} 
                alphaTest={0.5}
                transparent={false}
                side={THREE.DoubleSide}
                roughness={0.3}
                metalness={0.2}
              />
            </mesh>
            {/* Sliced layers effect for solid 3D extrusion */}
            {Array.from({ length: 100 }).map((_, i) => {
               const offset = ((i - 50) * (scaleZ * 0.9)) / 100;
               return (
                  <mesh key={i} position={[0, 0, offset]}>
                    <planeGeometry args={[texScaleX * 0.9, texScaleY * 0.9]} />
                    <meshStandardMaterial 
                      color="#ffffff"
                      map={texture} 
                      alphaTest={0.5}
                      transparent={false}
                      side={THREE.DoubleSide}
                      roughness={0.8}
                    />
                  </mesh>
               )
            })}
          </group>
        ) : (
          <mesh>
            <boxGeometry args={[scaleX, scaleY, scaleZ]} />
            <meshBasicMaterial 
                color="#00aaff" 
                transparent 
                opacity={0.3} 
                wireframe={true}
            />
          </mesh>
        )}
      </group>
    </PivotControls>
  );
}

export default function PrintLab() {
  const [inputText, setInputText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePrint, setActivePrint] = useState<PrintSpec | null>(null);
  const [status, setStatus] = useState("AWAITING INPUT OR IMAGE UPLOAD...");
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        const b64 = (reader.result as string).split(',')[1];
        setBase64Data(b64);
        setStatus("IMAGE LOADED. READY FOR LABISTS ANALYSIS.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !base64Data) return;
    
    setIsProcessing(true);
    setStatus("AI ANALYZING DIMENSIONS & PRINT PARAMETERS...");
    
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        let contents: any[] = [
          `You are a 3D printing expert system generating specifications for a Labists FDM printer.
           Based on the user's input, estimate the real-world dimensions (in mm) and suggest standard print settings.
           Output ONLY a valid JSON object with the keys: partName, dimensions (object with x,y,z in mm), material, infill, layerHeight, estimatedTime, notes.
           Input: "${inputText}"`
        ];

        if (base64Data) {
            const mimeMatch = imagePreview?.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
            const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
            contents = [
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                },
                `Analyze this image and estimate it as a 3D printable part for a Labists printer.
                 Include the user description if provided: "${inputText}".
                 Output ONLY a valid JSON object: { partName, dimensions: {x,y,z}, material, infill, layerHeight, estimatedTime, notes }`
            ];
        }

        const response = await ai.models.generateContent({
           model: "gemini-3.1-flash-lite", 
           contents,
           config: {
             responseMimeType: "application/json"
           }
        });

        if (response.text) {
           let rawText = response.text.trim();
           if (rawText.startsWith('```')) {
             rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
           }
           let data;
           try {
               data = JSON.parse(rawText);
           } catch (err) {
               console.error("JSON Parse Error:", err);
               setStatus("ERROR: FAILED TO PARSE AI RESPONSE.");
               setIsProcessing(false);
               return;
           }

           const safeData = {
               partName: data.partName || "Custom Part",
               dimensions: data.dimensions || { x: 150, y: 50, z: 80 },
               material: data.material || "PLA",
               infill: data.infill || "15%",
               layerHeight: data.layerHeight || "0.2mm",
               estimatedTime: data.estimatedTime || "Unknown",
               notes: data.notes || ""
           };

           setActivePrint(safeData);
           setStatus(`RENDER COMPLETE: ${String(safeData.partName).toUpperCase()}`);
        }
      } else {
        // Fallback for dev without key
        setTimeout(() => {
          setActivePrint({
            partName: inputText || "Uploaded Drone Part",
            dimensions: { x: 150, y: 30, z: 80 },
            material: "PLA+ or PETG",
            infill: "20% Gyroid",
            layerHeight: "0.2mm",
            estimatedTime: "4h 15m",
            notes: "Requires supports for overhangs."
          });
          setStatus("RENDER COMPLETE (FALLBACK DATA).");
          setIsProcessing(false);
        }, 1500);
        return;
      }
    } catch (e: any) {
      console.error(e);
      setStatus(`ERROR: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full relative font-sans flex flex-col md:flex-row text-white bg-[#050505]">
      
      {/* Toggle Button for Mobile / Clean View */}
      <button 
        onClick={() => setIsDashboardOpen(!isDashboardOpen)}
        className="absolute top-4 right-4 z-50 bg-black/80 border border-blue-500/50 text-blue-400 p-2 rounded hover:bg-blue-500/20 transition-colors backdrop-blur-sm shadow-[0_0_10px_rgba(59,130,246,0.3)] md:hidden pointer-events-auto"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isDashboardOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          ) : (
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          )}
        </svg>
      </button>

      {/* Sidebar / Top UI */}
      {isDashboardOpen && (
      <div className="w-full md:w-[26rem] h-[55%] md:h-full flex-shrink-0 bg-[#0a0a0c]/90 border-b md:border-b-0 md:border-r border-blue-500/20 backdrop-blur-md z-10 flex flex-col p-4 md:p-6 pointer-events-auto shadow-[0_4px_24px_rgba(0,0,0,0.5)] md:shadow-[4px_0_24px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="flex-shrink-0 flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] uppercase">
              3D PRINT LAB
            </h1>
            <h2 className="text-[10px] md:text-xs font-mono text-gray-400 opacity-80 uppercase tracking-widest mt-1">
              LABISTS REPLICATION ENGINES
            </h2>
          </div>
          {/* Desktop Collapse Toggle */}
          <button 
            onClick={() => setIsDashboardOpen(false)}
            className="hidden md:block text-blue-500/50 hover:text-blue-400"
          >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="mt-4 md:mt-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <form onSubmit={handleProcess} className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-2 relative">
                <label className="text-[10px] font-mono tracking-widest text-blue-400">UPLOAD REFERENCE IMAGE:</label>
                <div className="h-32 border-2 border-dashed border-blue-500/30 rounded flex items-center justify-center bg-blue-500/5 hover:bg-blue-500/10 transition-colors relative overflow-hidden group">
                   {imagePreview ? (
                       <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Preview" />
                   ) : (
                       <span className="text-xs font-mono text-gray-500 group-hover:text-blue-400 z-10 pointer-events-none">DRAG & DROP OR CLICK</span>
                   )}
                   <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono tracking-widest text-blue-400">PART DESCRIPTION (RC CAR, DRONE, ETC.):</label>
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="bg-black/60 border border-blue-500/30 text-white p-3 rounded font-mono text-sm focus:outline-none focus:border-blue-500 shadow-[inset_0_0_10px_rgba(59,130,246,0.05)] transition-colors resize-none"
                  rows={2}
                  placeholder="e.g. Drone wing 45 degree angle, thick base"
                />
            </div>

            <button 
              type="submit" 
              disabled={isProcessing || (!inputText.trim() && !imagePreview)}
              className="py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 font-bold uppercase tracking-widest text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.2)] mt-2"
            >
              {isProcessing ? "ANALYZING..." : "GENERATE 3D RENDER"}
            </button>
          </form>

          {/* Status Console */}
          <div className="mt-8 p-3 bg-black border border-gray-800 rounded">
             <p className="text-[10px] font-mono text-gray-500 uppercase">SYSTEM STATUS:</p>
             <p className={`text-xs font-mono mt-1 ${isProcessing ? 'text-yellow-400 animate-pulse' : 'text-blue-400'}`}>
                {status}
             </p>
          </div>

          {/* Spec Output */}
          {activePrint && !isProcessing && (
            <div className="mt-6 flex flex-col gap-3 pointer-events-auto animate-fade-in">
              <div className="p-4 bg-blue-900/10 border border-blue-500/30 rounded backdrop-blur-sm">
                <h3 className="text-sm font-bold uppercase text-blue-400 mb-3 border-b border-blue-500/20 pb-2">Print Specifications</h3>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-mono">
                  <div className="text-gray-500">PART</div>
                  <div className="text-white truncate" title={activePrint.partName}>{activePrint.partName}</div>
                  
                  <div className="text-gray-500">SIZE (mm)</div>
                  <div className="text-white">{activePrint.dimensions.x} x {activePrint.dimensions.y} x {activePrint.dimensions.z}</div>
                  
                  <div className="text-gray-500">MATERIAL</div>
                  <div className="text-white text-[10px]">{activePrint.material}</div>
                  
                  <div className="text-gray-500">INFILL</div>
                  <div className="text-white text-[10px]">{activePrint.infill}</div>
                  
                  <div className="text-gray-500">LAYER</div>
                  <div className="text-white">{activePrint.layerHeight}</div>
                  
                  <div className="text-gray-500">TIME</div>
                  <div className="text-white">{activePrint.estimatedTime}</div>
                </div>

                <div className="mt-4 pt-3 border-t border-blue-500/20">
                  <span className="text-[10px] text-blue-500 font-bold block mb-1">NOTES:</span>
                  <p className="text-[10px] text-gray-300 leading-snug font-sans">{activePrint.notes}</p>
                </div>

                <button 
                  onClick={() => {
                    if (!activePrint) return;
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activePrint, null, 2));
                    const dlJson = document.createElement('a');
                    dlJson.setAttribute("href", dataStr);
                    dlJson.setAttribute("download", `${activePrint.partName.replace(/\s+/g, '_')}_Specs.json`);
                    document.body.appendChild(dlJson);
                    dlJson.click();
                    dlJson.remove();

                    const mockGcode = `; LABISTS 3D PRINTER GCODE\n; Generated by Third Eye Forge AI\n; Part: ${activePrint.partName}\n; Material: ${activePrint.material}\n; Infill: ${activePrint.infill}\n; Layer Height: ${activePrint.layerHeight}\n\nG21 ; mm\nG90 ; absolute coordinates\nG28 ; home\nG1 Z15.0 F6000\n; ... [AI Generated Toolpath Data placeholder] ...`;
                    const gcodeBlob = new Blob([mockGcode], { type: 'text/plain' });
                    const gcodeUrl = URL.createObjectURL(gcodeBlob);
                    const dlGcode = document.createElement('a');
                    dlGcode.setAttribute("href", gcodeUrl);
                    dlGcode.setAttribute("download", `${activePrint.partName.replace(/\s+/g, '_')}.gcode`);
                    document.body.appendChild(dlGcode);
                    dlGcode.click();
                    dlGcode.remove();
                    URL.revokeObjectURL(gcodeUrl);

                    const mockStl = `solid ${activePrint.partName}\n  facet normal 0 0 1\n    outer loop\n      vertex 0 0 0\n      vertex 1 0 0\n      vertex 0 1 0\n    endloop\n  endfacet\nendsolid ${activePrint.partName}`;
                    const stlBlob = new Blob([mockStl], { type: 'text/plain' });
                    const stlUrl = URL.createObjectURL(stlBlob);
                    const dlStl = document.createElement('a');
                    dlStl.setAttribute("href", stlUrl);
                    dlStl.setAttribute("download", `${activePrint.partName.replace(/\s+/g, '_')}.stl`);
                    document.body.appendChild(dlStl);
                    dlStl.click();
                    dlStl.remove();
                    URL.revokeObjectURL(stlUrl);
                  }}
                  className="w-full mt-4 py-2 bg-blue-500/10 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 font-mono text-[10px] uppercase tracking-widest transition-colors flex justify-center items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  DOWNLOAD GCODE, STL & SPECS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* 3D Viewport */}
      <div className="flex-1 w-full relative bg-[#050505] overflow-hidden">
        <Canvas camera={{ position: [20, 15, 20], fov: 45 }}>
          <color attach="background" args={['#050505']} />
          <Environment preset="studio" environmentIntensity={0.5} />
          
          <ambientLight intensity={0.4} />
          <spotLight position={[10, 20, 10]} intensity={1.5} angle={0.5} penumbra={1} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3388ff" />

          <PrinterBed />
          <GeneratedObject activePrint={activePrint} imagePreview={imagePreview} />

          <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={40} blur={2} far={10} />
          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={5} maxDistance={50} />
        </Canvas>
      </div>
    </div>
  );
}
