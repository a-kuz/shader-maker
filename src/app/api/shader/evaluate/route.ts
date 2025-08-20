import { NextRequest, NextResponse } from 'next/server';
import { evaluateShader } from '@/lib/openai';
import { EvaluateShaderRequest, EvaluateShaderResponse } from '@/lib/types';
import { getPromptById, saveEvaluation } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.OPENAI_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const body: EvaluateShaderRequest = await request.json();
    const { id, screenshots } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Shader ID is required' },
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

    // Only evaluate if screenshots are provided
    if (!screenshots || screenshots.length === 0) {
      return NextResponse.json(
        { error: 'Screenshots are required for evaluation' },
        { status: 400 }
      );
    }

    // Evaluate shader
    console.log('About to evaluate shader:', { prompt: shaderData.prompt, codeLength: shaderData.code.length, screenshotsLength: screenshots.length });
    const { score, feedback } = await evaluateShader(
      shaderData.prompt,
      shaderData.code,
      screenshots
    );
    console.log('Evaluation result:', { score, feedback });

    // Save evaluation to database
    saveEvaluation(id, score, feedback);

    const response: EvaluateShaderResponse = {
      score,
      feedback
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error evaluating shader:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to evaluate shader: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 