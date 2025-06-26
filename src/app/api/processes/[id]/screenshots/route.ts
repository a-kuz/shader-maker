import { NextRequest, NextResponse } from 'next/server';
import { ProcessRunner } from '@/lib/processRunner';
import { SubmitScreenshotsRequest } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processId } = await params;
    const body: SubmitScreenshotsRequest = await request.json();
    const { stepId, screenshots, compilationError } = body;

    if (!stepId) {
      return NextResponse.json(
        { error: 'Step ID is required' },
        { status: 400 }
      );
    }

    if (!screenshots || (screenshots.length === 0 && !compilationError)) {
      return NextResponse.json(
        { error: 'Screenshots are required unless there is a compilation error' },
        { status: 400 }
      );
    }

    console.log(`📸 Received ${screenshots.length} screenshots for process ${processId}, step ${stepId}`);
    if (compilationError) {
      console.log('⚠️ Compilation error detected:', compilationError.message);
    }

    await ProcessRunner.submitScreenshots(processId, stepId, screenshots, compilationError);

    return NextResponse.json({ 
      success: true,
      message: compilationError 
        ? `Processed ${screenshots.length} screenshots with compilation error - starting fix`
        : `Processed ${screenshots.length} screenshots`
    });
  } catch (error) {
    console.error('Error submitting screenshots:', error);
    return NextResponse.json(
      { error: 'Failed to submit screenshots: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 