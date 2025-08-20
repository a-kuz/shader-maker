import { NextRequest, NextResponse } from 'next/server';
import { improveShader } from '@/lib/openai';
import { ImproveShaderRequest, ImproveShaderResponse } from '@/lib/types';
import { getPromptById, savePrompt } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.OPENAI_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const body: ImproveShaderRequest = await request.json();
    const { id, feedback, screenshots } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Shader ID is required' },
        { status: 400 }
      );
    }

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback is required for improvement' },
        { status: 400 }
      );
    }

    if (!screenshots || screenshots.length === 0) {
      return NextResponse.json(
        { error: 'Screenshots are required for improvement' },
        { status: 400 }
      );
    }

    // Get shader data from database
    const shaderData = getPromptById(id);
    if (!shaderData) {
      return NextResponse.json(
        { error: 'Shader not found' },
        { status: 404 }
      );
    }

    // Improve shader
    const { code: improvedCode } = await improveShader(
      shaderData.prompt,
      shaderData.code,
      feedback,
      screenshots
    );

    // Create a new entry for the improved shader
    const iterationId = uuidv4();
    savePrompt({
      id: iterationId,
      prompt: `[IMPROVED] ${shaderData.prompt}`,
      code: improvedCode,
      screenshots: []
    });

    const response: ImproveShaderResponse = {
      id: iterationId,
      code: improvedCode
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error improving shader:', error);
    return NextResponse.json(
      { error: 'Failed to improve shader' },
      { status: 500 }
    );
  }
} 