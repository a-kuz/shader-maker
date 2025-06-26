import { NextRequest, NextResponse } from 'next/server';
import ProcessRunner from '@/lib/processRunner';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const processId = (await params).id;
    
    if (!processId) {
      return NextResponse.json(
        { error: 'Process ID is required' },
        { status: 400 }
      );
    }

    // Create capture step now that shader has compiled successfully
    const captureStepId = ProcessRunner.createCaptureStep(processId);
    
    return NextResponse.json({ 
      success: true, 
      captureStepId 
    });
    
  } catch (error) {
    console.error('Error creating capture step:', error);
    return NextResponse.json(
      { error: 'Failed to create capture step: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 