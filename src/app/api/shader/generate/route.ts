import { NextRequest, NextResponse } from 'next/server';
import { generateShader } from '@/lib/openai';
import { GenerateShaderRequest, GenerateShaderResponse } from '@/lib/types';
import { savePrompt } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const body: GenerateShaderRequest = await request.json();
    const { prompt } = body;

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Generate shader code
    const { code: shaderCode } = await generateShader(prompt);
    
    // Store shader data in database
    const shaderId = uuidv4();
    savePrompt({
      id: shaderId,
      prompt,
      code: shaderCode,
      screenshots: []
    });

    const response: GenerateShaderResponse = {
      id: shaderId,
      code: shaderCode
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating shader:', error);
    return NextResponse.json(
      { error: 'Failed to generate shader' },
      { status: 500 }
    );
  }
} 