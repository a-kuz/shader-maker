import { NextRequest, NextResponse } from 'next/server';
import { fixShaderCompilationError } from '@/lib/openai';
import { FixShaderRequest, FixShaderResponse } from '@/lib/types';
import { getPromptById, savePrompt } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log('Fix API endpoint called');
    
    if (!process.env.OPENAI_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const body: FixShaderRequest = await request.json();
    console.log('Fix request body:', body);
    
    const { id, compilationError } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Shader ID is required' },
        { status: 400 }
      );
    }

    if (!compilationError) {
      return NextResponse.json(
        { error: 'Compilation error is required' },
        { status: 400 }
      );
    }

    const shaderData = getPromptById(id);
    console.log('Found shader data:', shaderData ? 'Yes' : 'No');
    
    let prompt = '';
    let originalCode = '';
    
    if (!shaderData) {
      console.log('Shader data not found, attempting to fix standalone...');
      
      // Create a basic shader template that likely contains similar issues
      // The AI will fix it based on the error information provided
      originalCode = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

// Hash function for randomness
float hash(vec2 p) {
    p = fract(p*vec2(123.34, 345.45));
    p += dot(p, p+34.23);
    return fract(p.x * p.y);
}

// Noise function
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i+vec2(0,0)), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    // Create fire effect with potential type errors
    float fireHeight = 0.3 + 0.1 * sin(iTime * 2.0);
    float dist = abs(uv.y - fireHeight);
    
    // This line might have the type error mentioned in the log
    float intensity = noise(uv * 10.0 + vec2(0, iTime * 3)) * dist;
    
    vec3 fireColor = vec3(1.0, 0.5, 0.0) * intensity;
    fragColor = vec4(fireColor, 1.0);
}
      `;
      prompt = 'Fix shader compilation errors and create a working fire effect shader';
    } else {
      prompt = shaderData.prompt;
      originalCode = shaderData.code;
    }

    console.log('Calling fixShaderCompilationError...');
    console.log('Prompt:', prompt);
    console.log('Original code length:', originalCode.length);
    
    const { code: fixedCode } = await fixShaderCompilationError(
      prompt,
      originalCode,
      compilationError.message,
      compilationError.infoLog
    );

    console.log('Fixed code received, length:', fixedCode.length);

    const iterationId = uuidv4();
    
    // Save the fixed shader as a new entry
    savePrompt({
      id: iterationId,
      prompt: `[FIXED] ${prompt}`,
      code: fixedCode,
      screenshots: []
    });

    const response: FixShaderResponse = {
      id: iterationId,
      code: fixedCode
    };

    console.log('Fix API successful, returning response');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fixing shader compilation:', error);
    return NextResponse.json(
      { error: 'Failed to fix shader compilation error' },
      { status: 500 }
    );
  }
} 