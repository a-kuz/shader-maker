import { NextRequest, NextResponse } from 'next/server';
import { ProcessRunner } from '@/lib/processRunner';
import { StartProcessRequest, StartProcessResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const body: StartProcessRequest = await request.json();
    const { prompt, config } = body;

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting new process:', { prompt, config });

    const processId = await ProcessRunner.startProcess({
      prompt: prompt.trim(),
      config
    });

    const response: StartProcessResponse = {
      processId,
      status: 'created'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error starting process:', error);
    return NextResponse.json(
      { error: 'Failed to start process: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 