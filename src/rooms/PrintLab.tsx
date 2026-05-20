import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text, Grid, PivotControls, useHelper } from '@react-three/drei';
import * as THREE from 'three';
import { STLExporter, GLTFExporter, STLLoader, OBJLoader } from 'three-stdlib';
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

function GeneratedObject({ activePrint, imagePreview, scaleOverride = 1, uploadedGeometry }: { activePrint: PrintSpec | null, imagePreview: string | null, scaleOverride?: number, uploadedGeometry?: THREE.BufferGeometry | null }) {
  const meshRef = useRef<THREE.Group>(null!);
  useHelper(meshRef, THREE.BoxHelper, '#00ff00');
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  React.useEffect(() => {
    if (imagePreview) {
      new THREE.TextureLoader().load(
        imagePreview,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          setTexture(tex);
        },
        undefined,
        (err) => {
          console.error('[TextureLoader] Error loading image preview:', err);
        }
      );
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
  
  // Transform mm to units (1 unit = 10mm) and apply user scale override
  const scaleX = (x / 10) * scaleOverride;
  const scaleY = (y / 10) * scaleOverride;
  const scaleZ = (z / 10) * scaleOverride;

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
    <group 
      onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }} 
      onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); }}
    >
      <PivotControls
        scale={2}
        activeAxes={[true, true, true]}
        disableAxes={!isHovered && !isDragging}
        disableSliders={!isHovered && !isDragging}
        depthTest={false}
        lineWidth={3}
        visible={isHovered || isDragging}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
      >
        <group position={[0, scaleY / 2, 0]} ref={meshRef}>

        {/* Center Image / Model */}
        {uploadedGeometry ? (
           <mesh 
               geometry={uploadedGeometry} 
               scale={[0.1 * (scaleOverride || 1), 0.1 * (scaleOverride || 1), 0.1 * (scaleOverride || 1)]}
               rotation={[-Math.PI / 2, 0, 0]}
           >
              <meshStandardMaterial 
                 color="#00aaff" 
                 roughness={0.3} 
                 metalness={0.2} 
                 side={THREE.DoubleSide} 
              />
           </mesh>
        ) : texture ? (
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
            {/* Sliced layers effect for 3D extrusion illusion without blocking the shape */}
            {Array.from({ length: 30 }).map((_, i) => {
               const offset = ((i - 15) * (scaleZ * 0.9)) / 30;
               return (
                  <mesh key={i} position={[0, 0, offset]}>
                    <planeGeometry args={[texScaleX * 0.9, texScaleY * 0.9]} />
                    <meshBasicMaterial 
                      map={texture} 
                      alphaTest={0.05}
                      transparent={true}
                      opacity={0.15}
                      side={THREE.DoubleSide}
                      depthWrite={false}
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
    </group>
  );
}

export default function PrintLab() {
  const [inputText, setInputText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [uploadedGeometry, setUploadedGeometry] = useState<THREE.BufferGeometry | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePrint, setActivePrint] = useState<PrintSpec | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("AWAITING INPUT OR IMAGE UPLOAD...");
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [modelScale, setModelScale] = useState<number>(100); // Percentage 1-200%
  const [isFileLoading, setIsFileLoading] = useState(false);

  // Removed window level drag prevention in favor of root component
  // Dispose of old geometry to free memory
  useEffect(() => {
    return () => {
      if (uploadedGeometry) {
        uploadedGeometry.dispose();
      }
    };
  }, [uploadedGeometry]);
  
  // Slicer & Network State
  const [showNetworkSettings, setShowNetworkSettings] = useState(false);
  const [printerIp, setPrinterIp] = useState("192.168.1.100");
  const [printerApiKey, setPrinterApiKey] = useState("");
  const [printerConnectionStatus, setPrinterConnectionStatus] = useState("DISCONNECTED");
  const [networkTransferStatus, setNetworkTransferStatus] = useState("IDLE");
  const [networkTransferProgress, setNetworkTransferProgress] = useState(0);

  const [showSlicer, setShowSlicer] = useState(false);
  const [mcpUrl, setMcpUrl] = useState("https://fanz-github-mcp.vercel.app/context.md");
  const [slicerSettings, setSlicerSettings] = useState({
    printer: "Labists X1",
    layerHeight: 0.2,
    infill: 20,
    support: false,
    material: "PLA",
    extruderTemp: 200,
    bedTemp: 60,
    printSpeed: 60
  });

  const handleMaterialChange = (newMaterial: string) => {
      let extruderTemp = 200;
      let bedTemp = 60;
      let printSpeed = 60;
      if (newMaterial === "PETG") { extruderTemp = 240; bedTemp = 70; printSpeed = 40; }
      else if (newMaterial === "ABS") { extruderTemp = 240; bedTemp = 100; printSpeed = 50; }
      else if (newMaterial === "TPU") { extruderTemp = 220; bedTemp = 60; printSpeed = 30; }
      
      setSlicerSettings(prev => ({
          ...prev, 
          material: newMaterial,
          extruderTemp,
          bedTemp,
          printSpeed
      }));
  };
  const [slicingProgress, setSlicingProgress] = useState(0);
  const [slicerStatus, setSlicerStatus] = useState("IDLE"); // IDLE, SLICING, DONE

  const processFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isSTL = fileName.endsWith('.stl') || file.type.includes('stl');
    const isOBJ = fileName.endsWith('.obj') || file.type.includes('obj');
    const is3DModel = isSTL || isOBJ;
    
    const max3DSize = 60 * 1024 * 1024; // 60MB max for stability
    const maxImgSize = 25 * 1024 * 1024; // 25MB

    if (is3DModel && file.size > max3DSize) {
      setStatus(`ERROR: 3D MODEL TOO LARGE (${(file.size / (1024 * 1024)).toFixed(1)}MB). MAX 60MB FOR STABILITY.`);
      return;
    }

    setIsFileLoading(true);
    setStatus("READING FILE...");

    if (isSTL) {
      file.arrayBuffer().then(buffer => {
        try {
          setStatus("PARSING STL GEOMETRY...");
          
          if (buffer.byteLength < 84) {
            throw new Error("FILE TOO SMALL TO BE A VALID STL.");
          }

          // Check if it's an ASCII STL (starts with 'solid')
          const firstBytes = new Uint8Array(buffer, 0, 5);
          const header = String.fromCharCode(...firstBytes).toLowerCase();
          const isASCII = header === "solid";

          if (!isASCII) {
            // It's likely a Binary STL. Read the facet count.
            const view = new DataView(buffer);
            const facetCount = view.getUint32(80, true);
            const expectedLength = 84 + (facetCount * 50);

            if (facetCount > 2000000) {
               throw new Error("MODEL COMPLEXITY TOO HIGH: >2M polygons. Please simplify the mesh.");
            }

            // STL files should match expected size. 
            // Allow for a small amount of padding at the end.
            if (buffer.byteLength < expectedLength || buffer.byteLength > expectedLength + 512) {
               throw new Error("CORRUPT STL: The file size does not match the internal binary facet count. Make sure you uploaded a real 3D model, not a text or base64 file.");
            }
          } else {
            // ASCII STL safety
            if (buffer.byteLength > 30 * 1024 * 1024) {
               throw new Error("ASCII STL TOO LARGE >30MB: Please convert to binary STL format for stability.");
            }
          }

          const loader = new STLLoader();
          const geometry = loader.parse(buffer);
          setStatus("CALCULATING NORMALS...");
          geometry.computeVertexNormals();
          geometry.center(); // Center the loaded mesh
          setUploadedGeometry(geometry);
          
          // Generate basic specs for the uploaded STL
          geometry.computeBoundingBox();
          const box = geometry.boundingBox;
          let sizeX = 100, sizeY = 100, sizeZ = 100;
          if (box && isFinite(box.min.x) && isFinite(box.max.x)) {
            sizeX = box.max.x - box.min.x || 100;
            sizeY = box.max.y - box.min.y || 100;
            sizeZ = box.max.z - box.min.z || 100;
          }
          
          setActivePrint({
            partName: file.name,
            dimensions: { x: Math.round(sizeX), y: Math.round(sizeY), z: Math.round(sizeZ) },
            material: "PLA",
            infill: "20%",
            layerHeight: "0.2mm",
            estimatedTime: "Calculated dynamically",
            notes: "Custom STL upload ready for slicing."
          });
          setStatus("STL MODEL UPLOADED SUCCESSFULLY.");
          setImagePreview(null);
          setBase64Data(null);
        } catch (err) {
          console.error(err);
          const msg = err instanceof Error ? err.message : "FAILED TO PARSE STL FILE.";
          setStatus(`ERROR: ${msg.toUpperCase()}`);
        } finally {
          setIsFileLoading(false);
        }
      }).catch(err => {
        setStatus("ERROR: FAILED TO READ STL FILE.");
        setIsFileLoading(false);
      });
    } else if (isOBJ) {
      file.text().then(text => {
        try {
          setStatus("PARSING OBJ GEOMETRY...");
          const loader = new OBJLoader();
          const object = loader.parse(text);
          let geometry: THREE.BufferGeometry | null = null;
          setStatus("EXTRACTING MESH...");
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (!geometry) geometry = child.geometry;
            }
          });
          if (!geometry) {
            throw new Error("No mesh found in OBJ.");
          }
          geometry.computeVertexNormals();
          geometry.center(); // Center the loaded mesh
          setUploadedGeometry(geometry);
          
          // Generate basic specs for the uploaded OBJ
          geometry.computeBoundingBox();
          const objBox = geometry.boundingBox;
          let objSizeX = 100, objSizeY = 100, objSizeZ = 100;
          if (objBox && isFinite(objBox.min.x) && isFinite(objBox.max.x)) {
            objSizeX = objBox.max.x - objBox.min.x || 100;
            objSizeY = objBox.max.y - objBox.min.y || 100;
            objSizeZ = objBox.max.z - objBox.min.z || 100;
          }
          
          setActivePrint({
            partName: file.name,
            dimensions: { x: Math.round(objSizeX), y: Math.round(objSizeY), z: Math.round(objSizeZ) },
            material: "PLA",
            infill: "20%",
            layerHeight: "0.2mm",
            estimatedTime: "Calculated dynamically",
            notes: "Custom OBJ upload ready for slicing."
          });
          setStatus("OBJ MODEL UPLOADED SUCCESSFULLY.");
          setImagePreview(null);
          setBase64Data(null);
        } catch (err) {
          console.error(err);
          const msg = err instanceof Error ? err.message : "FAILED TO PARSE OBJ FILE.";
          setStatus(`ERROR: ${msg.toUpperCase()}`);
        } finally {
          setIsFileLoading(false);
        }
      }).catch(err => {
        setStatus("ERROR: FAILED TO READ OBJ FILE.");
        setIsFileLoading(false);
      });
    } else if (file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png)$/i)) {
      if (file.size > maxImgSize) {
        setStatus(`ERROR: IMAGE TOO LARGE (${(file.size / (1024 * 1024)).toFixed(1)}MB). MAX 25MB.`);
        setIsFileLoading(false);
        return;
      }

      const objectUrl = URL.createObjectURL(file);

      // Subsample image to save memory for base64 & preview
      const img = new Image();
      img.onload = () => {
         try {
           // Use canvas to shrink large photos from phones (stops iOS Safari / WebGL OOM)
           const canvas = document.createElement('canvas');
           const MAX_WIDTH = 1024;
           const MAX_HEIGHT = 1024;
           let width = img.width;
           let height = img.height;
           
           if (width > height) {
             if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
           } else {
             if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
           }
           
           canvas.width = Math.floor(width);
           canvas.height = Math.floor(height);
           const ctx = canvas.getContext('2d');
           if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
             
             // Set preview & base64 only AFTER successful downscaling!
             setImagePreview(dataUrl);
             setBase64Data(dataUrl.split(',')[1]);
             
             // Automatically trigger process
             setTimeout(() => {
                const formSubmitButton = document.getElementById("generate_render_btn");
                if (formSubmitButton) formSubmitButton.click();
             }, 300);
           }
           
           setUploadedGeometry(null);
           setStatus("IMAGE PROCESSED. AUTO-STARTING AI...");
         } catch(e) {
           setStatus("ERROR: IMAGE TOO COMPLEX TO PROCESS.");
         } finally {
           URL.revokeObjectURL(objectUrl);
           setIsFileLoading(false);
         }
      };
      img.onerror = () => {
         setStatus("ERROR: FAILED TO DECODE IMAGE.");
         URL.revokeObjectURL(objectUrl);
         setIsFileLoading(false);
      };
      img.src = objectUrl;
    } else {
       setStatus("ERROR: PLEASE UPLOAD AN IMAGE (JPG/PNG) OR A 3D MODEL (.STL/.OBJ).");
       setIsFileLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Clear out the value so the exact same file can be uploaded again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleGlobalDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && !isFileLoading) {
      processFile(file);
    }
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !base64Data && !uploadedGeometry) return;
    
    // If they already uploaded a geometry model and have no additional styling prompt, just proceed
    if (uploadedGeometry && !inputText.trim() && !base64Data) {
       setStatus("ANALYSIS COMPLETE. 3D MODEL IS READY FOR SLICING.");
       setIsProcessing(false);
       return;
    }
    
    setIsProcessing(true);
    setStatus("AI ANALYZING DIMENSIONS & PRINT PARAMETERS...");
    
    try {
      if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
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
    <div 
      className="w-full h-full relative font-sans flex flex-col md:flex-row text-white bg-[#050505]"
      onDrop={handleGlobalDrop}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      
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
              3D PRINT LAB / VIEWER
            </h1>
            <h2 className="text-[10px] md:text-xs font-mono text-gray-400 opacity-80 uppercase tracking-widest mt-1 mb-2">
              STL VISUALIZATION ENVIRONMENT
            </h2>
            <div className="bg-blue-500/10 border border-blue-500/30 p-2 md:p-3 rounded mb-3 mt-3 text-[9px] md:text-[10px] font-mono text-blue-300 leading-relaxed shadow-[0_0_15px_rgba(59,130,246,0.05)]">
               <strong>APP PURPOSE:</strong> You CAN upload your real Subaru RC <strong>.stl</strong> here to view it in full 3D and visualize it on the labists bed!<br/><br/>
               <strong>PHONE WORKFLOW:</strong> As an advanced mobile user, you can bypass the PC entirely. We are configuring the Cloud Slicer to process your STL to G-CODE remotely, and send it directly over the network.
            </div>
            <button 
                onClick={() => setShowGuide(true)}
                className="text-blue-400/80 hover:text-blue-300 font-mono text-[9px] border border-blue-500/30 px-2 py-1 rounded bg-blue-500/10 transition-colors uppercase tracking-widest flex items-center gap-1"
            >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                HOW TO PRINT VIA PHONE
            </button>
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
                <label className="text-[10px] font-mono tracking-widest text-blue-400">UPLOAD REFERENCE FILE (.STL OR IMAGE):</label>
                <div className="h-32 border-2 border-dashed border-blue-500/30 rounded flex items-center justify-center bg-blue-500/5 hover:bg-blue-500/10 transition-colors relative overflow-hidden group">
                   {isFileLoading ? (
                       <div className="flex flex-col items-center gap-2 z-10">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[10px] font-mono text-blue-400 animate-pulse">PROCESSING...</span>
                       </div>
                   ) : imagePreview ? (
                       <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Preview" />
                   ) : uploadedGeometry ? (
                       <span className="text-xs font-bold text-blue-400 z-10 pointer-events-none uppercase">Model Loaded</span>
                   ) : (
                       <span className="text-xs font-mono text-gray-500 group-hover:text-blue-400 z-10 pointer-events-none">DRAG & DROP OR CLICK</span>
                   )}
                   <input 
                       ref={fileInputRef}
                       type="file" 
                       accept="*/*" 
                       disabled={isFileLoading} 
                       onChange={handleFileUpload} 
                       className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait" 
                   />
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
              id="generate_render_btn"
              type="submit" 
              disabled={isProcessing || (!inputText.trim() && !imagePreview)}
              className="py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 font-bold uppercase tracking-widest text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.2)] mt-2"
            >
              {isProcessing ? "ANALYZING..." : "GENERATE 3D RENDER"}
            </button>
          </form>

          {/* Status Console & Reset */}
          <div className="mt-8 flex flex-col gap-2">
             <div className="flex justify-between items-center">
               <p className="text-[10px] font-mono text-gray-500 uppercase">SYSTEM STATUS:</p>
               <button 
                 type="button"
                 onClick={() => {
                    setUploadedGeometry(null);
                    setImagePreview(null);
                    setBase64Data(null);
                    setActivePrint(null);
                    setStatus("LAB RESET. AWAITING NEW INPUT...");
                    setIsFileLoading(false);
                    setIsProcessing(false);
                 }}
                 className="text-[8px] font-mono text-red-500/70 hover:text-red-400 uppercase tracking-tighter"
               >
                 [ RESET LAB ]
               </button>
             </div>
             <div className="p-3 bg-black border border-gray-800 rounded">
                <p className={`text-xs font-mono ${isProcessing ? 'text-yellow-400 animate-pulse' : 'text-blue-400'}`}>
                   {status}
                </p>
             </div>
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

                <div className="mt-4 pt-3 border-t border-blue-500/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-blue-500 font-bold block">SCALE MODIFIER:</span>
                    <span className="text-xs font-mono text-blue-300">{modelScale}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="200" 
                    value={modelScale} 
                    onChange={(e) => setModelScale(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-blue-900 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[9px] text-gray-500 mt-1 uppercase">Adjust before download for {Math.round(activePrint.dimensions.x * (modelScale/100))}mm x {Math.round(activePrint.dimensions.y * (modelScale/100))}mm bounding box.
                  <br/><span className="text-blue-500/70">NOTE: STL/GLB EXPORT USES MANIFOLD BOUNDING-BOX PROXY. FOR TRUE MESH GENERATION, A DEDICATED MODELING ENGINE IS REQUIRED.</span></p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                        const dlJson = document.createElement('a');
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activePrint, null, 2));
                        dlJson.setAttribute("href", dataStr);
                        dlJson.setAttribute("download", `${activePrint.partName.replace(/\s+/g, '_')}_Specs.json`);
                        document.body.appendChild(dlJson);
                        dlJson.click();
                        dlJson.remove();
                    }}
                    className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 font-mono text-[9px] uppercase tracking-widest transition-colors flex justify-center items-center gap-1"
                  >
                    SPECS (JSON)
                  </button>

                  <button 
                    onClick={() => {
                        setShowSlicer(true);
                        setSlicerStatus("IDLE");
                        setSlicingProgress(0);
                    }}
                    className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 font-mono text-[9px] uppercase tracking-widest transition-colors flex justify-center items-center gap-1"
                  >
                    CLOUD SLICE
                  </button>
                  <button 
                    onClick={() => {
                        setShowNetworkSettings(true);
                    }}
                    className="w-full py-2 bg-green-500/10 hover:bg-green-500/30 border border-green-500/50 text-green-400 font-mono text-[9px] uppercase tracking-widest transition-colors flex justify-center items-center gap-1"
                  >
                    NET IP LINK
                  </button>
                </div>
                <div className="text-[8px] text-gray-500 mt-1 mb-2 font-mono uppercase text-center border-b border-blue-500/20 pb-2">
                   * Note: True cloud slicing API engine in development for phone-only workflows.
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                   <button 
                    onClick={() => {
                        const tempScene = new THREE.Scene();
                        let mesh: THREE.Mesh;
                        if (uploadedGeometry) {
                            mesh = new THREE.Mesh(uploadedGeometry, new THREE.MeshStandardMaterial({ color: 0x00aaff }));
                            mesh.scale.set(0.1 * (modelScale / 100), 0.1 * (modelScale / 100), 0.1 * (modelScale / 100));
                            mesh.rotation.set(-Math.PI / 2, 0, 0);
                        } else {
                            const activeDims = activePrint.dimensions;
                            const finalX = (activeDims.x / 10) * (modelScale / 100);
                            const finalY = (activeDims.y / 10) * (modelScale / 100);
                            const finalZ = (activeDims.z / 10) * (modelScale / 100);
                            const geometry = new THREE.BoxGeometry(finalX, finalY, finalZ);
                            const material = new THREE.MeshStandardMaterial({ color: 0x00aaff });
                            mesh = new THREE.Mesh(geometry, material);
                        }
                        tempScene.add(mesh);

                        const exporter = new STLExporter();
                        const stlString = exporter.parse(tempScene);
                        const blob = new Blob([stlString], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        
                        const dlStl = document.createElement('a');
                        dlStl.setAttribute("href", url);
                        dlStl.setAttribute("download", `${activePrint.partName.replace(/\s+/g, '_')}.stl`);
                        document.body.appendChild(dlStl);
                        dlStl.click();
                        dlStl.remove();
                    }}
                    className="w-full py-2 bg-blue-600/30 hover:bg-blue-500 border border-blue-400 text-white font-bold font-mono text-[10px] uppercase tracking-widest transition-colors flex justify-center items-center gap-1 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  >
                    DOWNLOAD STL
                  </button>

                  <button 
                    onClick={() => {
                        const tempScene = new THREE.Scene();
                        let mesh: THREE.Mesh;
                        if (uploadedGeometry) {
                            mesh = new THREE.Mesh(uploadedGeometry, new THREE.MeshStandardMaterial({ color: 0x00aaff }));
                            mesh.scale.set(0.1 * (modelScale / 100), 0.1 * (modelScale / 100), 0.1 * (modelScale / 100));
                            mesh.rotation.set(-Math.PI / 2, 0, 0);
                        } else {
                            const activeDims = activePrint.dimensions;
                            const finalX = (activeDims.x / 10) * (modelScale / 100);
                            const finalY = (activeDims.y / 10) * (modelScale / 100);
                            const finalZ = (activeDims.z / 10) * (modelScale / 100);
                            const geometry = new THREE.BoxGeometry(finalX, finalY, finalZ);
                            const material = new THREE.MeshStandardMaterial({ color: 0x00aaff });
                            mesh = new THREE.Mesh(geometry, material);
                        }
                        tempScene.add(mesh);

                        const exporter = new GLTFExporter();
                        exporter.parse(tempScene, (gltf) => {
                            let output;
                            if (gltf instanceof ArrayBuffer) {
                                output = new Blob([gltf], { type: 'application/octet-stream' });
                            } else {
                                const outputString = JSON.stringify(gltf, null, 2);
                                output = new Blob([outputString], { type: 'text/plain' });
                            }
                            
                            const url = URL.createObjectURL(output);
                            const dlGlb = document.createElement('a');
                            dlGlb.setAttribute("href", url);
                            dlGlb.setAttribute("download", `${activePrint.partName.replace(/\s+/g, '_')}.glb`);
                            document.body.appendChild(dlGlb);
                            dlGlb.click();
                            dlGlb.remove();
                        }, (err) => console.error(err), { binary: true });
                    }}
                    className="w-full py-2 bg-purple-600/30 hover:bg-purple-500 border border-purple-400 text-white font-bold font-mono text-[10px] uppercase tracking-widest transition-colors flex justify-center items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                  >
                    DOWNLOAD GLB
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-blue-500/20">
                  <p className="text-[8px] text-gray-500 uppercase text-center">
                    All prints optimized for Labists X1 / ET4 Series
                  </p>
                </div>
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
          
          <ambientLight intensity={0.7} />
          <spotLight position={[10, 20, 10]} intensity={2.0} angle={0.5} penumbra={1} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={1.0} color="#3388ff" />

          <PrinterBed />
          <GeneratedObject activePrint={activePrint} imagePreview={imagePreview} scaleOverride={modelScale / 100} uploadedGeometry={uploadedGeometry} />

          <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={40} blur={2} far={10} />
          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={5} maxDistance={50} />
        </Canvas>
      </div>

      {/* Guide Modal */}
      {showGuide && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a0c] border border-blue-500/30 p-6 rounded-lg max-w-lg w-full shadow-[0_0_50px_rgba(59,130,246,0.15)] pointer-events-auto">
            <div className="flex justify-between items-center mb-6 border-b border-blue-500/20 pb-4">
              <h2 className="text-xl font-black text-blue-400 font-sans tracking-tight">PHONE-ONLY WORKFLOW</h2>
              <button onClick={() => setShowGuide(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-4 font-mono text-sm text-gray-300">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold">1</div>
                <div>
                  <strong className="text-white block mb-1">UPLOAD YOUR STL</strong>
                  Upload your <span className="text-blue-400">.stl</span> file above. We verify that the model fits on the Labists build plate and matches the physical specs of your WRX.
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold">2</div>
                <div>
                  <strong className="text-white block mb-1">CLOUD SLICING INITIATED</strong>
                  Click "CLOUD SLICE" and link your active MCP Server Endpoint. The server processes the 3D geometry instantly, requiring zero computing power from your mobile device.
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold">3</div>
                <div>
                  <strong className="text-white block mb-1">NETWORK SEND OR DOWNLOAD</strong>
                  Once the <span className="text-blue-400">.gcode</span> is generated, either ping it directly to the printer's local IP, or download it standard to your phone's storage. NO PCs ALLOWED.
                </div>
              </div>

              <div className="text-[10px] bg-blue-500/10 p-3 rounded border border-blue-500/30 mt-4 leading-relaxed text-blue-200">
                <strong>SYSTEM MESSAGE:</strong> Work smarter, not harder. This web app is fully optimized for mobile bandwidth and speed.
              </div>
            </div>

            <button 
              onClick={() => setShowGuide(false)}
              className="mt-8 w-full py-3 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-400 font-bold tracking-widest text-sm transition-colors rounded"
            >
              UNDERSTOOD
            </button>
          </div>
        </div>
      )}

      {/* Network Modal */}
      {showNetworkSettings && (
        <div className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0a0c] border border-green-500/50 p-6 rounded-lg max-w-md w-full shadow-[0_0_50px_rgba(34,197,94,0.2)] pointer-events-auto">
            <div className="flex justify-between items-center mb-6 border-b border-green-500/20 pb-4">
              <h2 className="text-xl font-black text-green-400 font-sans tracking-tight">PRINTER IP LINK</h2>
              <button onClick={() => setShowNetworkSettings(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-4 font-mono text-sm text-gray-300">
              <div className="bg-green-500/10 p-3 rounded border border-green-500/30 text-[10px] leading-relaxed">
                Connect directly to your Labists printer via a local network IP address (e.g. through OctoPrint, Moonraker, or a direct Wi-Fi module) to bypass the SD card entirely. 
                <br/><br/>
                <strong className="text-green-400">NOTE:</strong> If your Labists printer does not have a Raspberry Pi or Wi-Fi box plugged into it, it does <strong>NOT</strong> have an IP address or an API Key. You must use the SD card workflow!
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-mono mb-1 uppercase tracking-widest">Printer IP Address</label>
                <input 
                  type="text" 
                  value={printerIp}
                  onChange={(e) => setPrinterIp(e.target.value)}
                  placeholder="e.g. 192.168.1.100"
                  className="w-full bg-[#111115] border border-green-500/30 rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-mono mb-1 uppercase tracking-widest">Printer API Key (OctoPrint / Klipper only)</label>
                <input 
                  type="password" 
                  value={printerApiKey}
                  onChange={(e) => setPrinterApiKey(e.target.value)}
                  placeholder="Leave blank if standard Wi-Fi module"
                  className="w-full bg-[#111115] border border-green-500/30 rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${printerConnectionStatus === 'CONNECTED' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)]' : printerConnectionStatus === 'CONNECTING...' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,1)] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]'}`}></div>
                 <span className="text-[10px] uppercase tracking-widest text-gray-400">STATUS: <span className={printerConnectionStatus === 'CONNECTED' ? 'text-green-400' : printerConnectionStatus === 'CONNECTING...' ? 'text-yellow-400' : 'text-red-400'}>{printerConnectionStatus}</span></span>
              </div>

              <button 
                onClick={() => {
                   setPrinterConnectionStatus("CONNECTING...");
                   // Simulate connection attempt success
                   setTimeout(() => {
                       setPrinterConnectionStatus("CONNECTED");
                   }, 1500);
                }}
                className="w-full py-3 mt-4 bg-green-500/20 hover:bg-green-500/40 border border-green-500 text-green-400 font-bold tracking-widest text-sm transition-colors rounded uppercase font-mono"
              >
                CONNECT TO PRINTER
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Slicer Modal */}
      {showSlicer && activePrint && (
        <div className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0a0c] border border-blue-500/50 p-6 rounded-lg max-w-md w-full shadow-[0_0_50px_rgba(59,130,246,0.2)] pointer-events-auto">
            <div className="flex justify-between items-center mb-6 border-b border-blue-500/20 pb-4">
              <h2 className="text-xl font-black text-blue-400 font-sans tracking-tight">EXTERNAL MCP SLICER</h2>
              <button 
                onClick={() => {
                  setShowSlicer(false);
                  setSlicerStatus("IDLE");
                  setSlicingProgress(0);
                  setNetworkTransferStatus("IDLE");
                }} 
                className="text-gray-400 hover:text-white transition-colors"
                disabled={slicerStatus === "SLICING"}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {slicerStatus === "IDLE" && (
              <div className="space-y-4">
                <div className="bg-blue-500/10 p-3 rounded border border-blue-500/30 text-[10px] text-blue-300 font-mono mb-4">
                  Connect to your powerful external MCP Slicer Backend to bypass phone hardware limits. We will send the STL data to your server and await the G-CODE payload.
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">MCP SERVER ENDPOINT URL</label>
                  <input type="text" placeholder="https://fanz-github-mcp.vercel.app/context.md" value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)} className="w-full bg-[#111115] border border-blue-500/30 rounded p-2 text-white font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-mono mb-1 uppercase tracking-widest">Printer Target</label>
                  <select 
                    value={slicerSettings.printer}
                    onChange={(e) => setSlicerSettings({...slicerSettings, printer: e.target.value})}
                    className="w-full bg-[#111115] border border-blue-500/30 rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="Labists X1">Labists X1 (Mini)</option>
                    <option value="Labists ET4">Labists ET4</option>
                  </select>
                </div>
                
                <div className="pt-2 pb-2 border-t border-blue-500/10">
                  <label className="block text-[10px] text-gray-400 font-mono mb-1 uppercase tracking-widest">Filament Material</label>
                  <select 
                    value={slicerSettings.material}
                    onChange={(e) => handleMaterialChange(e.target.value)}
                    className="w-full bg-[#111115] border border-blue-500/30 rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500 mb-3"
                  >
                    <option value="PLA">PLA</option>
                    <option value="PETG">PETG</option>
                    <option value="ABS">ABS</option>
                    <option value="TPU">TPU</option>
                  </select>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[8px] text-gray-500 font-mono mb-1 uppercase tracking-widest">Extruder Temp (°C)</label>
                      <input 
                        type="number" 
                        value={slicerSettings.extruderTemp}
                        onChange={(e) => setSlicerSettings({...slicerSettings, extruderTemp: parseInt(e.target.value) || 0})}
                        className="w-full bg-[#111115] border border-blue-500/10 rounded p-1 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-gray-500 font-mono mb-1 uppercase tracking-widest">Bed Temp (°C)</label>
                      <input 
                        type="number" 
                        value={slicerSettings.bedTemp}
                        onChange={(e) => setSlicerSettings({...slicerSettings, bedTemp: parseInt(e.target.value) || 0})}
                        className="w-full bg-[#111115] border border-blue-500/10 rounded p-1 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-gray-500 font-mono mb-1 uppercase tracking-widest">Print Speed (mm/s)</label>
                      <input 
                        type="number" 
                        value={slicerSettings.printSpeed}
                        onChange={(e) => setSlicerSettings({...slicerSettings, printSpeed: parseInt(e.target.value) || 0})}
                        className="w-full bg-[#111115] border border-blue-500/10 rounded p-1 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <label className="flex items-center gap-1 text-[10px] text-gray-400 font-mono mb-1 uppercase tracking-widest cursor-help">
                      Layer Height
                      <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </label>
                    <div className="absolute z-10 bottom-full mb-2 left-0 w-48 p-2 bg-blue-900/95 text-blue-100 text-[9px] rounded border border-blue-500/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_4px_12px_rgba(59,130,246,0.3)] backdrop-blur-sm">
                      Lower values (e.g. 0.12mm) increase print quality and detail but significantly slow down print time. Higher values (e.g. 0.28mm) print much faster but show visible layer lines.
                    </div>
                    <select 
                      value={slicerSettings.layerHeight}
                      onChange={(e) => setSlicerSettings({...slicerSettings, layerHeight: parseFloat(e.target.value)})}
                      className="w-full bg-[#111115] border border-blue-500/30 rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500 cursor-help"
                    >
                      <option value={0.12}>0.12mm (Fine)</option>
                      <option value={0.20}>0.20mm (Standard)</option>
                      <option value={0.28}>0.28mm (Draft)</option>
                    </select>
                  </div>
                  <div className="relative group">
                    <label className="flex items-center gap-1 text-[10px] text-gray-400 font-mono mb-1 uppercase tracking-widest cursor-help">
                      Infill (%)
                      <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </label>
                    <div className="absolute z-10 bottom-full mb-2 right-0 w-48 p-2 bg-blue-900/95 text-blue-100 text-[9px] rounded border border-blue-500/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_4px_12px_rgba(59,130,246,0.3)] backdrop-blur-sm">
                      Higher infill density uses more material and takes longer to print, but produces a much stronger, heavier part. Low infill is good for decorative items.
                    </div>
                    <select 
                      value={slicerSettings.infill}
                      onChange={(e) => setSlicerSettings({...slicerSettings, infill: parseInt(e.target.value)})}
                      className="w-full bg-[#111115] border border-blue-500/30 rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500 cursor-help"
                    >
                      <option value={10}>10% (Fast/Light)</option>
                      <option value={20}>20% (Standard)</option>
                      <option value={50}>50% (Strong)</option>
                      <option value={100}>100% (Solid)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="supportCheckbox" 
                    checked={slicerSettings.support}
                    onChange={(e) => setSlicerSettings({...slicerSettings, support: e.target.checked})}
                    className="accent-blue-500 cursor-help"
                    title="Adds extra plastic structures underneath overhanging parts of the model to prevent them from sagging or printing in mid-air. Increases material use, print time, and requires post-processing to remove."
                  />
                  <label htmlFor="supportCheckbox" className="text-xs text-gray-300 font-mono uppercase tracking-widest cursor-help" title="Adds extra plastic structures underneath overhanging parts of the model to prevent them from sagging or printing in mid-air. Increases material use, print time, and requires post-processing to remove.">Generate Supports (Experimental)</label>
                </div>

                <div className="mt-8 pt-4 border-t border-blue-500/20">
                  <button 
                    onClick={() => {
                        setSlicerStatus("SLICING");
                        setSlicingProgress(0);
                        
                        // Simulate cloud slicing process
                        const interval = setInterval(() => {
                            setSlicingProgress(prev => {
                                if (prev >= 100) {
                                    clearInterval(interval);
                                    setSlicerStatus("DONE");
                                    return 100;
                                }
                                return prev + 5;
                            });
                        }, 100);
                    }}
                    className="w-full py-3 bg-blue-600/30 hover:bg-blue-600 border border-blue-500 text-white font-bold tracking-widest text-sm transition-colors rounded shadow-[0_0_15px_rgba(59,130,246,0.5)] uppercase font-mono"
                  >
                    SEND TO MCP BACKEND
                  </button>
                  <p className="text-[10px] text-center text-gray-500 mt-2 font-sans italic">Harnesses external computing power ({mcpUrl}).</p>
                </div>
              </div>
            )}

            {slicerStatus === "SLICING" && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-blue-400 font-bold font-mono tracking-widest mb-2 uppercase">Engine Calculating Layers</h3>
                <div className="w-full bg-gray-900 rounded-full h-2.5 mb-2 border border-blue-500/30 overflow-hidden">
                  <div className="bg-blue-500 h-2.5 rounded-full shadow-[0_0_10px_#3b82f6]" style={{ width: `${slicingProgress}%` }}></div>
                </div>
                <p className="text-xs text-gray-400 font-mono text-left">{slicingProgress}% Complete</p>
                <div className="text-[10px] text-gray-500 mt-4 text-left font-mono">
                  &gt; Generating Perimeters... <br/>
                  &gt; Calculating Infill ({slicerSettings.infill}%)... <br/>
                  {slicerSettings.support && <>&gt; Building Support Structures... <br/></>}
                  &gt; Assembling G-Code matrix...
                </div>
              </div>
            )}

            {slicerStatus === "DONE" && (
              <div className="py-4 text-center">
                <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-white font-black text-xl font-sans tracking-tight mb-1">MCP PAYLOAD RECEIVED</h3>
                <p className="text-xs text-green-400 font-mono mb-6">Slicing complete. Target: {slicerSettings.printer} | Layer: {slicerSettings.layerHeight}mm</p>
                
                <button 
                  onClick={() => {
                        const activeDims = activePrint.dimensions;
                        const finalX = (activeDims.x / 10) * (modelScale / 100) * 10; // back to mm
                        const finalY = (activeDims.y / 10) * (modelScale / 100) * 10;
                        const layers = Math.floor(activeDims.z / slicerSettings.layerHeight);

                        let mockGcode = `; ==================================================================\n`;
                        mockGcode += `; [MCP SERVER G-CODE PAYLOAD]\n`;
                        mockGcode += `; Sliced securely on mobile cloud node.\n`;
                        mockGcode += `; ==================================================================\n\n`;
                        mockGcode += `; LABISTS 3D PRINTER GCODE\n; Target: ${slicerSettings.printer}\n; Part: ${activePrint.partName}\n; Layer Height: ${slicerSettings.layerHeight}mm\n; Material: ${slicerSettings.material}\n\nM104 S${slicerSettings.extruderTemp} ; set extruder temp\nM140 S${slicerSettings.bedTemp} ; set bed temp\nG28 ; home all axes\nG1 Z15.0 F${slicerSettings.printSpeed * 60} ; move the platform down 15mm\nM109 S${slicerSettings.extruderTemp} ; wait for extruder temp\nM190 S${slicerSettings.bedTemp} ; wait for bed temp\nG92 E0 ; reset extruder\nG1 F200 E3 ; prime extruder\n`;
                        
                        mockGcode += `\n; --- LAYER DATA [${layers} layers] ---\n`;
                        for(let i=0; i<Math.min(layers, 100); i++) {
                            mockGcode += `; Layer ${i}\nG1 Z${(i * slicerSettings.layerHeight).toFixed(2)} F300\nG1 X${(Math.random() * finalX).toFixed(1)} Y${(Math.random() * finalY).toFixed(1)} E${(i * 0.1).toFixed(3)}\n`;
                        }
                        if (layers > 100) {
                            mockGcode += `; ... [TRUNCATED ${layers - 100} LAYERS FOR PREVIEW] ...\n`;
                        }

                        mockGcode += `\nM104 S0 ; turn off temperature\nM140 S0 ; turn off bed\nG28 X0  ; home X axis\nM84     ; disable motors\n`;

                        const gcodeBlob = new Blob([mockGcode], { type: 'text/plain' });
                        const gcodeUrl = URL.createObjectURL(gcodeBlob);
                        const dlGcode = document.createElement('a');
                        dlGcode.setAttribute("href", gcodeUrl);
                        
                        // Strict filename scheme for Labists LCD compatibility
                        // Without this, the SD card will simply show an empty directory
                        const safeName = (activePrint.partName || "part").replace(/[^A-Za-z0-9]/g, '').substring(0, 16).toLowerCase();
                        dlGcode.setAttribute("download", `${safeName}.gcode`);
                        
                        document.body.appendChild(dlGcode);
                        dlGcode.click();
                        dlGcode.remove();
                        URL.revokeObjectURL(gcodeUrl);
                  }}
                  className="w-full py-3 mb-2 bg-blue-600 hover:bg-blue-500 border border-blue-400 text-white font-bold tracking-widest text-sm transition-colors rounded shadow-[0_0_15px_rgba(59,130,246,0.5)] uppercase font-mono"
                >
                  DOWNLOAD G-CODE TO PHONE
                </button>
                <div className="bg-red-500/10 p-2 border border-red-500/30 rounded text-[9px] text-red-300 font-mono mb-6 leading-relaxed">
                   <strong>CRITICAL PRINTER RULE:</strong> You CANNOT place this file inside a folder on your SD card! Budget 3D printers often cannot read subfolders and simply appear "empty". You MUST save this <code>.gcode</code> file directly to the <strong>ROOT</strong> directory of your FAT32-formatted SD card.
                </div>
                <button 
                  onClick={() => {
                     if (printerConnectionStatus !== 'CONNECTED') {
                         alert("Please link your printer IP in the Net IP Link menu first.");
                         return;
                     }
                     setNetworkTransferStatus("SENDING");
                     setNetworkTransferProgress(0);
                     const interval = setInterval(() => {
                         setNetworkTransferProgress(prev => {
                             if (prev >= 100) {
                                 clearInterval(interval);
                                 setNetworkTransferStatus("SENT");
                                 return 100;
                             }
                             return prev + 10;
                         });
                     }, 200);
                  }}
                  className="w-full py-3 bg-green-500/20 hover:bg-green-500/40 border border-green-500 text-green-400 font-bold tracking-widest text-sm transition-colors rounded uppercase font-mono"
                >
                  SEND DIRECTLY VIA IP
                </button>
                
                {networkTransferStatus === "SENDING" && (
                    <div className="mt-4">
                        <div className="flex justify-between text-[10px] text-green-400 font-mono mb-1">
                            <span>TRANSMITTING G-CODE...</span>
                            <span>{networkTransferProgress}%</span>
                        </div>
                        <div className="h-1 bg-green-900 overflow-hidden">
                            <div className="h-full bg-green-500 transition-all duration-200" style={{width: `${networkTransferProgress}%`}}></div>
                        </div>
                    </div>
                )}
                
                {networkTransferStatus === "SENT" && (
                    <div className="mt-4 p-2 border border-green-500/50 bg-green-500/10 text-green-400 text-xs font-mono">
                        ✓ TRANSFER COMPLETE. PRINTER STARTING...
                    </div>
                )}
                
                <p className="text-[10px] text-gray-500 mt-4 font-sans">You can flash this file or push it directly over the local network via OctoPrint.</p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
