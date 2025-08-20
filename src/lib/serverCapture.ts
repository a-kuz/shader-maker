// src/lib/serverScreenshotCapture.ts
import puppeteer, { Browser, Page } from 'puppeteer';

interface CaptureOptions {
  width?: number;
  height?: number;
  timeValues?: number[];
}

const DEFAULT_OPTIONS: Required<CaptureOptions> = {
  width: 1280,
  height: 720,
  timeValues: [0.1, 0.2, 0.5, 0.8, 1.2, 1.5, 3, 5, 10]
};

export class ServerShaderCapture {
  private static browser: Browser | null = null;

  static async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: false,  // Enable visual mode for WebGL
        devtools: true,   // Open DevTools automatically
        slowMo: 500,      // Delay between actions
        args: [
          '--enable-webgl',
          '--enable-webgl2',
          '--disable-web-security',
          '--ignore-gpu-blacklist',
          '--start-maximized'  // Open in full size
        ],
        timeout: 10000
      });
    }
    return this.browser;
  }

  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  static generateShaderHTML(shaderCode: string, options: Required<CaptureOptions>): string {
    // Safely escape shader code for JSON
    const jsonShaderCode = JSON.stringify(shaderCode);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shader Capture</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #000;
            overflow: hidden;
        }
        #shader-canvas {
            display: block;
            width: ${options.width}px;
            height: ${options.height}px;
        }
    </style>
</head>
<body>
    <canvas id="shader-canvas" width="${options.width}" height="${options.height}"></canvas>
    
    <script>
        // Pass shader code via JSON for safety
        window.shaderCodeData = ${jsonShaderCode};
        
        (function initShader() {
            console.log('Starting shader initialization...');
        const canvas = document.getElementById('shader-canvas');
        console.log('Canvas element found:', canvas);
        
                    // Try WebGL 2.0 first, then WebGL 1.0
            let gl = canvas.getContext('webgl2', {
                preserveDrawingBuffer: true,
                antialias: false,
                alpha: false,
                powerPreference: "high-performance"
            });
            
            if (!gl) {
                console.log('WebGL 2.0 not available, falling back to WebGL 1.0');
                gl = canvas.getContext('webgl', {
                    preserveDrawingBuffer: true,
                    antialias: false,
                    alpha: false,
                    powerPreference: "high-performance"
                });
                    } else {
            console.log('Using WebGL 2.0');
        }
        
        let isWebGL2 = !!gl && gl.constructor.name === 'WebGL2RenderingContext';

        if (!gl) {
            console.error('WebGL not supported');
            window.shaderReady = false;
            window.compilationError = 'WebGL not supported';
            return;
        }
        
        console.log('WebGL context created successfully');

        // Vertex shader
        let vertexShaderSource;
        if (isWebGL2) {
            // WebGL 2.0 version
            vertexShaderSource = \`#version 300 es
                in vec4 position;
                void main() {
                    gl_Position = position;
                }
            \`;
        } else {
            // WebGL 1.0 version
            vertexShaderSource = \`
                attribute vec4 position;
                void main() {
                    gl_Position = position;
                }
            \`;
        }

        // Fragment shader (user code)
        let fragmentShaderSource;
        if (isWebGL2) {
            // WebGL 2.0 supports GLSL ES 3.00
            let shaderCode = window.shaderCodeData;
            
            // Convert GLSL ES 1.00 to GLSL ES 3.00
            if (!shaderCode.includes('#version')) {
                // Replace gl_FragColor with fragColor
                shaderCode = shaderCode.replace(/gl_FragColor/g, 'fragColor');
                
                // Replace texture2D with texture
                shaderCode = shaderCode.replace(/texture2D/g, 'texture');
                
                // Replace varying with in (if exists)
                shaderCode = shaderCode.replace(/varying\\s+/g, 'in ');
                
                fragmentShaderSource = 
                    '#version 300 es\\n' +
                    'precision mediump float;\\n' +
                    'uniform float iTime;\\n' +
                    'uniform vec2 iResolution;\\n' +
                    'out vec4 fragColor;\\n\\n' +
                    shaderCode + '\\n\\n' +
                    'void main() {\\n' +
                    '    vec2 fragCoord = gl_FragCoord.xy;\\n' +
                    '    mainImage(fragColor, fragCoord);\\n' +
                    '}';
            } else {
                // Already contains version, use as is
                fragmentShaderSource = 
                    'uniform float iTime;\\n' +
                    'uniform vec2 iResolution;\\n\\n' +
                    shaderCode + '\\n\\n' +
                    'void main() {\\n' +
                    '    vec2 fragCoord = gl_FragCoord.xy;\\n' +
                    '    mainImage(fragColor, fragCoord);\\n' +
                    '}';
            }
        } else {
            // WebGL 1.0 uses GLSL ES 1.00
            fragmentShaderSource = 
                'precision mediump float;\\n' +
                'uniform float iTime;\\n' +
                'uniform vec2 iResolution;\\n\\n' +
                window.shaderCodeData + '\\n\\n' +
                'void main() {\\n' +
                '    vec2 fragCoord = gl_FragCoord.xy;\\n' +
                '    mainImage(gl_FragColor, fragCoord);\\n' +
                '}';
        }

        function createShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const error = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error('Shader compilation error: ' + error);
            }
            
            return shader;
        }

        function createProgram(gl, vertexShader, fragmentShader) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                const error = gl.getProgramInfoLog(program);
                gl.deleteProgram(program);
                throw new Error('Program linking error: ' + error);
            }
            
            return program;
        }

        // Create shaders and program
        let program, iTimeLocation, iResolutionLocation, positionLocation, positionBuffer;
        let compilationError = null;
        
        try {
            const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
            program = createProgram(gl, vertexShader, fragmentShader);

            // Create fullscreen triangle geometry
            positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1, -1,
                 3, -1,
                -1,  3
            ]), gl.STATIC_DRAW);

            // Get uniform locations
            iTimeLocation = gl.getUniformLocation(program, 'iTime');
            iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
            positionLocation = gl.getAttribLocation(program, 'position');

            // Set up viewport
            gl.viewport(0, 0, ${options.width}, ${options.height});
            
            window.shaderReady = true;
            window.compilationError = null;
        } catch (error) {
            console.error('Shader compilation failed:', error.message);
            compilationError = error.message;
            window.shaderReady = false;
            window.compilationError = error.message;
        }

            // Function for rendering with given time
            window.renderWithTime = function(time) {
                if (!program || compilationError) {
                    return false;
                }
                
                try {
                    gl.useProgram(program);
                    
                    // Set uniforms
                    gl.uniform1f(iTimeLocation, time);
                    gl.uniform2f(iResolutionLocation, ${options.width}, ${options.height});
                    
                    // Bind attributes
                    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                    gl.enableVertexAttribArray(positionLocation);
                    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
                    
                    // Render
                    gl.drawArrays(gl.TRIANGLES, 0, 3);
                    
                    return true;
                } catch (error) {
                    console.error('Render error:', error);
                    return false;
                }
            };
        })(); // Close and call initShader function
    </script>
</body>
</html>
    `;
  }

  static async captureShaderScreenshots(
    shaderCode: string,
    processId: string,
    options: CaptureOptions = {}
  ): Promise<string[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    console.log(`🎬 Starting server-side capture for process ${processId}`);

    const browser = await this.initBrowser();
    const page = await browser.newPage();

    // Intercept console logs from browser
    page.on('console', (msg) => {
      console.log(`🌐 Browser console: ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
      console.error(`🌐 Browser error:`, error);
    });

    try {
      await page.setViewport({ 
        width: opts.width, 
        height: opts.height,
        deviceScaleFactor: 1
      });

      // Try simple approach - via data URL
      try {
        const html = this.generateShaderHTML(shaderCode, opts);
        console.log(`📄 Generated HTML size: ${html.length} characters`);
        
        await page.setContent(html, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        console.log('✅ HTML content loaded successfully');
      } catch (contentError) {
        console.log('⚠️ setContent failed, trying navigation approach:', contentError.message);
        
        // Alternative approach - via navigate to data URL
        const html = this.generateShaderHTML(shaderCode, opts);
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
        
        await page.goto(dataUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        console.log('✅ Navigation to data URL successful');
      }

      // Wait for shader readiness (increased timeout for debugging)
      await page.waitForFunction(() => window.shaderReady !== undefined, { timeout: 120000 });
      
      const isReady = await page.evaluate(() => window.shaderReady);
      if (!isReady) {
        const error = await page.evaluate(() => window.compilationError);
        throw new Error(`Shader compilation failed: ${error}`);
      }

      console.log(`📸 Shader ready, capturing screenshots with time values: ${opts.timeValues.join(', ')}`);

      // Capture screenshots for each time value
      const screenshots: string[] = [];
      
      for (let i = 0; i < opts.timeValues.length; i++) {
        const timeValue = opts.timeValues[i];
        
        // Render with given time
        const renderSuccess = await page.evaluate((time) => {
          return window.renderWithTime(time);
        }, timeValue);
        
        if (!renderSuccess) {
          throw new Error(`Failed to render frame at time ${timeValue}`);
        }
        
        // Small delay for render stabilization
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const screenshotBuffer = await page.screenshot({
          type: 'png',
          clip: { x: 0, y: 0, width: opts.width, height: opts.height }
        });
        
        const base64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
        screenshots.push(base64);
        
        console.log(`📷 Captured screenshot ${i + 1}/${opts.timeValues.length} (time: ${timeValue})`);
      }

      console.log(`✅ Server capture completed: ${screenshots.length} screenshots`);
      return screenshots;

    } catch (error) {
      console.error(`❌ Server capture failed for process ${processId}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  static async captureShaderWithCompilationCheck(
    shaderCode: string,
    processId: string,
    options: CaptureOptions = {}
  ): Promise<{ screenshots: string[], compilationError?: { message: string, infoLog?: string } }> {
    console.log(`🔍 Server capture with compilation check for process ${processId}`);

    try {
      const screenshots = await this.captureShaderScreenshots(shaderCode, processId, options);
      return { screenshots };
    } catch (error) {
      // If error contains shader compilation information
      if (error.message.includes('Shader compilation failed')) {
        const compilationError = {
          message: error.message.replace('Shader compilation failed: ', ''),
          infoLog: error.message
        };
        console.log(`⚠️ Compilation error detected: ${compilationError.message}`);
        return { screenshots: [], compilationError };
      }
      
      throw error;
    }
  }
}

// Export utility functions
export async function initServerCapture(): Promise<void> {
  await ServerShaderCapture.initBrowser();
}

export async function closeServerCapture(): Promise<void> {
  await ServerShaderCapture.closeBrowser();
}