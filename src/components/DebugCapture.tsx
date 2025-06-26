'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function DebugCapture() {
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCapture = () => {
    setScreenshots([]);
    setIsCapturing(true);
    setTimeout(() => setIsCapturing(false), 3000);
  };

  return (
    <div className="p-4 border border-gray-600 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Debug Screenshot Capture</h3>
      
      <div className="bg-black rounded-lg overflow-hidden h-[200px] mb-4">
        <Canvas 
          gl={{ 
            preserveDrawingBuffer: true,
            antialias: false,
            alpha: false,
            powerPreference: "high-performance"
          }}
          camera={{ position: [0, 0, 5] }}
          dpr={1}
        >
          <color attach="background" args={['#000000']} />
          <DebugShader isCapturing={isCapturing} onCapture={setScreenshots} />
        </Canvas>
      </div>
      
      <button
        onClick={startCapture}
        disabled={isCapturing}
        className="px-4 py-2 bg-blue-600 rounded font-medium disabled:bg-gray-600 mb-4"
      >
        {isCapturing ? 'Capturing...' : 'Start Debug Capture'}
      </button>
      
      <div className="text-sm text-gray-300 mb-2">
        Screenshots captured: {screenshots.length}
      </div>
      
      {screenshots.length > 0 && (
        <div className="grid grid-cols-6 gap-2">
          {screenshots.map((screenshot, index) => (
            <div key={index} className="w-16 h-16 bg-gray-800 rounded overflow-hidden">
              <img
                src={screenshot}
                alt={`Debug ${index + 1}`}
                className="w-full h-full object-cover"
                onError={() => console.error(`Screenshot ${index + 1} failed to load`)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DebugShader({ isCapturing, onCapture }: { 
  isCapturing: boolean; 
  onCapture: (screenshots: string[]) => void; 
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { gl, scene, camera, size } = useThree();
  const [startTime] = useState(Date.now());
  const [frameCount, setFrameCount] = useState(0);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);

  // Simple colorful shader
  const fragmentShader = `
    uniform float iTime;
    uniform vec2 iResolution;
    
    void main() {
      vec2 uv = gl_FragCoord.xy / iResolution.xy;
      vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const vertexShader = `
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // Initialize material
  if (!materialRef.current && meshRef.current) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0.0 },
        iResolution: { value: new THREE.Vector2(size.width, size.height) }
      },
      fragmentShader,
      vertexShader,
    });
    
    meshRef.current.material = material;
    materialRef.current = material;
  }

  const captureScreenshot = () => {
    try {
      // Force a render using Three.js methods
      gl.render(scene, camera);
      
      const canvas = gl.domElement;
      console.log('🔧 Debug capture attempt:', {
        canvasSize: `${canvas.width}x${canvas.height}`,
        frameCount,
        preserveDrawingBuffer: gl.getContextAttributes()?.preserveDrawingBuffer
      });
      
      // Use requestAnimationFrame to ensure rendering is complete
      requestAnimationFrame(() => {
        try {
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          
          if (dataUrl && dataUrl !== 'data:,' && dataUrl.length > 1000) {
            setScreenshots(prev => {
              const newScreenshots = [...prev, dataUrl];
              console.log('🔧 Debug screenshot captured:', newScreenshots.length);
              return newScreenshots;
            });
          } else {
            console.warn('🔧 Debug capture failed:', { dataUrlLength: dataUrl.length });
            
            // Try alternative method: create temporary canvas
            try {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = canvas.width;
              tempCanvas.height = canvas.height;
              const ctx = tempCanvas.getContext('2d');
              
              if (ctx) {
                ctx.drawImage(canvas, 0, 0);
                const altDataUrl = tempCanvas.toDataURL('image/png', 1.0);
                
                if (altDataUrl && altDataUrl !== 'data:,' && altDataUrl.length > 1000) {
                  setScreenshots(prev => {
                    const newScreenshots = [...prev, altDataUrl];
                    console.log('🔧 Debug screenshot captured (alt method):', newScreenshots.length);
                    return newScreenshots;
                  });
                } else {
                  console.warn('🔧 Alternative capture also failed');
                }
              }
            } catch (altError) {
              console.error('🔧 Alternative capture error:', altError);
            }
          }
        } catch (error) {
          console.error('🔧 Screenshot conversion error:', error);
        }
      });
    } catch (error) {
      console.error('🔧 Debug capture error:', error);
    }
  };

  useFrame(() => {
    setFrameCount(prev => prev + 1);
    
    if (materialRef.current) {
      materialRef.current.uniforms.iTime.value = (Date.now() - startTime) / 1000;
      materialRef.current.uniforms.iResolution.value.set(size.width, size.height);
      
      if (isCapturing && frameCount > 3) {
        const now = Date.now();
        if (now - lastCaptureTime > 300) {
          captureScreenshot();
          setLastCaptureTime(now);
        }
      }
    }
  });

  // Send screenshots to parent when capture is done
  if (!isCapturing && screenshots.length > 0) {
    onCapture(screenshots);
    setScreenshots([]);
  }

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[4, 4]} />
      <shaderMaterial />
    </mesh>
  );
} 