'use client';

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ShaderCompilationError } from '@/lib/types';

interface ShaderCanvasProps {
  shaderCode: string;
  onScreenshotCapture?: (screenshots: string[]) => void;
  onCompilationError?: (error: ShaderCompilationError) => void;
  onCompilationSuccess?: () => void;
  captureScreenshots?: boolean;
  captureInterval?: number;
  captureDuration?: number;
}

// Component that renders the shader on a plane
function ShaderPlane({ 
  shaderCode, 
  captureScreenshots = false,
  onScreenshotCapture,
  onCompilationError,
  onCompilationSuccess
}: ShaderCanvasProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { gl, scene, camera, size } = useThree();
  const [startTime, setStartTime] = useState(Date.now());
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);
  const [captureStopped, setCaptureStopped] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [lastCompiledCode, setLastCompiledCode] = useState<string>('');
  
  // Reset capture state when captureScreenshots changes
  useEffect(() => {
    if (captureScreenshots) {
      const newStartTime = Date.now();
      console.log('🎬 Starting new screenshot capture session at', newStartTime);
      setStartTime(newStartTime);
      setScreenshots([]);
      setLastCaptureTime(0);
      setCaptureStopped(false);
      setFrameCount(0);
    }
  }, [captureScreenshots]);
  const [errorInterceptor, setErrorInterceptor] = useState<((message: string) => void) | null>(null);
  
  useEffect(() => {
    const originalConsoleError = console.error;
    
    const interceptError = (message: string, ...args: any[]) => {
      const fullMessage = [message, ...args].join(' ');
      
      if (fullMessage.includes('THREE.WebGLProgram: Shader Error') || 
          fullMessage.includes('VALIDATE_STATUS false') ||
          fullMessage.includes('Fragment shader is not compiled') ||
          fullMessage.includes('Vertex shader is not compiled') ||
          fullMessage.includes('ERROR:')) {
        
        let infoLog = '';
        if (args.length > 0) {
          infoLog = args.join('\n');
        }
        
        const errorMatch = fullMessage.match(/ERROR: \d+:\d+: '([^']+)' : (.+)/g);
        let errorDetails = '';
        if (errorMatch) {
          errorDetails = errorMatch.join('\n');
        }
        
        const compilationError: ShaderCompilationError = {
          message: 'Shader compilation failed',
          infoLog: infoLog || fullMessage,
          fragmentShaderLog: errorDetails || undefined,
          timestamp: new Date()
        };
        
        console.log('Captured shader compilation error:', compilationError);
        
        // Stop any screenshot capture when compilation fails
        setCaptureStopped(true);
        
        if (onCompilationError) {
          onCompilationError(compilationError);
        }
      }
      
      originalConsoleError(message, ...args);
    };
    
    console.error = interceptError;
    setErrorInterceptor(() => interceptError);
    
    return () => {
      console.error = originalConsoleError;
    };
  }, [onCompilationError]);
  
  useEffect(() => {
    if (!meshRef.current) return;
    
    try {
      let fragmentShader;
      
      if (!shaderCode || shaderCode.trim() === '') {
        fragmentShader = `
          uniform float iTime;
          uniform vec2 iResolution;
          
          void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            vec2 uv = fragCoord / iResolution.xy;
            vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
            fragColor = vec4(col, 1.0);
          }
          
          void main() {
            vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
            mainImage(color, gl_FragCoord.xy);
            gl_FragColor = color;
          }
        `;
      } else if (shaderCode.includes('mainImage')) {
        fragmentShader = `
          uniform float iTime;
          uniform vec2 iResolution;
          uniform vec2 iMouse;
          
          ${shaderCode}
          
          void main() {
            vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
            mainImage(color, gl_FragCoord.xy);
            gl_FragColor = color;
          }
        `;
      } else {
        fragmentShader = `
          uniform float iTime;
          uniform vec2 iResolution;
          
          void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            vec2 uv = fragCoord / iResolution.xy;
            fragColor = vec4(uv.x, uv.y, sin(iTime) * 0.5 + 0.5, 1.0);
          }
          
          void main() {
            vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
            mainImage(color, gl_FragCoord.xy);
            gl_FragColor = color;
          }
        `;
      }
      
      const vertexShader = `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;
      
      const material = new THREE.ShaderMaterial({
        uniforms: {
          iTime: { value: 0.0 },
          iResolution: { value: new THREE.Vector2(size.width, size.height) },
          iMouse: { value: new THREE.Vector2(0, 0) }
        },
        fragmentShader,
        vertexShader,
      });
      
      if (meshRef.current) {
        meshRef.current.material = material;
        materialRef.current = material;
      }
      
      // Call success callback only if shader code changed (not just size)
      if (onCompilationSuccess && shaderCode !== lastCompiledCode) {
        console.log('🎯 ShaderCanvas: Calling onCompilationSuccess for new code', {
          codeLength: shaderCode?.length || 0,
          lastCodeLength: lastCompiledCode?.length || 0
        });
        setLastCompiledCode(shaderCode);
        onCompilationSuccess();
      } else {
        console.log('🎯 ShaderCanvas: Skipping onCompilationSuccess', {
          hasCallback: !!onCompilationSuccess,
          codeChanged: shaderCode !== lastCompiledCode
        });
      }
    } catch (error) {
      console.error('Error setting up shader:', error);
      
      const compilationError: ShaderCompilationError = {
        message: error instanceof Error ? error.message : 'Unknown shader setup error',
        timestamp: new Date()
      };
      
      // Stop any screenshot capture when compilation fails
      setCaptureStopped(true);
      
      if (onCompilationError) {
        onCompilationError(compilationError);
      }
      
      const fallbackMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
      if (meshRef.current) {
        meshRef.current.material = fallbackMaterial;
      }
    }
  }, [shaderCode, size, lastCompiledCode]);

  // Function to capture screenshot with better reliability
  const captureScreenshot = () => {
    console.log('🎯 captureScreenshot called');
    try {
      // Force a render to ensure we have current content
      gl.render(scene, camera);
      
      // Get canvas
      const canvas = gl.domElement;
      console.log('🖼️ Canvas info:', {
        width: canvas.width,
        height: canvas.height,
        tagName: canvas.tagName
      });
      
      // Check if canvas has proper dimensions
      if (canvas.width === 0 || canvas.height === 0) {
        console.warn('Canvas has zero dimensions, skipping capture');
        return;
      }
      
      // Try different approaches for screenshot
      let dataUrl = '';
      
      // Method 1: Direct canvas capture
      try {
        dataUrl = canvas.toDataURL('image/png', 1.0);
      } catch (e) {
        console.warn('Direct canvas capture failed:', e);
      }
      
      // Method 2: If direct capture fails, try with blob
      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 1000) {
        try {
          // Create a new canvas and copy the WebGL content
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const ctx = tempCanvas.getContext('2d');
          
          if (ctx) {
            // Draw the WebGL canvas to our temp canvas
            ctx.drawImage(canvas, 0, 0);
            dataUrl = tempCanvas.toDataURL('image/png', 1.0);
          }
        } catch (e) {
          console.warn('Blob capture method failed:', e);
        }
      }
      
      // Method 3: If still no luck, try reading pixels directly
      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 1000) {
        try {
          const width = canvas.width;
          const height = canvas.height;
          const pixels = new Uint8Array(width * height * 4);
          
          // Read pixels from WebGL
          gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          
          // Create ImageData and draw to canvas
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const ctx = tempCanvas.getContext('2d');
          
          if (ctx) {
            const imageData = ctx.createImageData(width, height);
            
            // Flip Y coordinate (WebGL vs Canvas coordinate system)
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const srcIdx = ((height - y - 1) * width + x) * 4;
                const dstIdx = (y * width + x) * 4;
                imageData.data[dstIdx] = pixels[srcIdx];     // R
                imageData.data[dstIdx + 1] = pixels[srcIdx + 1]; // G
                imageData.data[dstIdx + 2] = pixels[srcIdx + 2]; // B
                imageData.data[dstIdx + 3] = pixels[srcIdx + 3]; // A
              }
            }
            
            ctx.putImageData(imageData, 0, 0);
            dataUrl = tempCanvas.toDataURL('image/png', 1.0);
          }
        } catch (e) {
          console.warn('Pixel reading method failed:', e);
        }
      }
      
      console.log('Screenshot capture result:', {
        dataUrlLength: dataUrl.length,
        canvasSize: `${canvas.width}x${canvas.height}`,
        frameCount,
        dataUrlPreview: dataUrl.substring(0, 50) + '...'
      });
      
      if (dataUrl && dataUrl !== 'data:,' && dataUrl.length > 1000) {
        setScreenshots(prev => {
          const newScreenshots = [...prev, dataUrl];
          console.log('Successfully captured screenshot', newScreenshots.length, 'total screenshots');
          return newScreenshots;
        });
      } else {
        console.warn('Screenshot capture failed - empty or invalid data', {
          dataUrl: dataUrl.substring(0, 100),
          length: dataUrl.length
        });
      }
    } catch (error) {
      console.error('Error in captureScreenshot:', error);
    }
  };
  
  // Update shader uniforms on each frame
  useFrame((_, delta) => {
    setFrameCount(prev => prev + 1);
    
    if (materialRef.current) {
      // Update time uniform
      materialRef.current.uniforms.iTime.value = (Date.now() - startTime) / 1000;
      materialRef.current.uniforms.iResolution.value.set(size.width, size.height);
      
      // Capture screenshots if enabled
      if (captureScreenshots && !captureStopped) {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        
        // Debug info every few frames
        if (frameCount % 30 === 0) {
          console.log('📊 Capture status:', {
            frameCount,
            elapsed: elapsed.toFixed(2),
            captureScreenshots,
            captureStopped,
            lastCaptureTime,
            timeSinceLastCapture: now - lastCaptureTime
          });
        }
        
        // Stop capturing after 3 seconds
        if (elapsed > 3) {
          if (!captureStopped) {
            console.log('⏹️ Stopping capture after 3 seconds');
            setCaptureStopped(true);
            // Use a ref to get the current screenshots value
            setScreenshots(currentScreenshots => {
              console.log('📋 Final screenshots count:', currentScreenshots.length);
              if (onScreenshotCapture && currentScreenshots.length > 0) {
                console.log('✅ Finalizing capture with', currentScreenshots.length, 'screenshots');
                onScreenshotCapture(currentScreenshots);
              } else {
                console.log('❌ No screenshots to finalize');
              }
              return currentScreenshots;
            });
          }
          return;
        }
        
        // Capture immediately on first frame, then every 0.5 seconds
        const shouldCaptureFirst = frameCount === 1 && elapsed > 0.1;
        const shouldCaptureInterval = frameCount > 5 && now - lastCaptureTime > 500;
        
        if (shouldCaptureFirst || shouldCaptureInterval) {
          console.log('📸 Triggering capture:', { 
            frameCount, 
            elapsed: elapsed.toFixed(2), 
            reason: shouldCaptureFirst ? 'first-frame' : 'interval',
            timeSinceLastCapture: now - lastCaptureTime
          });
          captureScreenshot();
          setLastCaptureTime(now);
        }
      }
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[4, 4]} />
      <shaderMaterial />
    </mesh>
  );
}

// Main component that sets up the canvas
export default function ShaderCanvas({
  shaderCode,
  onScreenshotCapture,
  onCompilationError,
  onCompilationSuccess,
  captureScreenshots = false,
  captureInterval = 500,
  captureDuration = 3000
}: ShaderCanvasProps) {
  return (
    <div className="w-full h-full">
      <Canvas 
        gl={{ 
          preserveDrawingBuffer: true,
          antialias: false, // Disable for better compatibility
          alpha: false,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
          stencil: false,
          depth: false,
          premultipliedAlpha: false
        }}
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={1} // Force DPR to 1 for consistent capture
      >
        <color attach="background" args={['#000000']} />
        <ShaderPlane 
          shaderCode={shaderCode} 
          captureScreenshots={captureScreenshots}
          onScreenshotCapture={onScreenshotCapture}
          onCompilationError={onCompilationError}
          onCompilationSuccess={onCompilationSuccess}
        />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
} 