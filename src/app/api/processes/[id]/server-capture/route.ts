import { NextRequest, NextResponse } from 'next/server';
import { ProcessRunner } from '@/lib/processRunner';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 SERVER CAPTURE ENDPOINT HIT!');
  try {
    const { id: processId } = await params;
    
    if (!processId) {
      return NextResponse.json(
        { error: 'Process ID is required' },
        { status: 400 }
      );
    }

    console.log(`🖥️ Starting server capture for process ${processId}`);

    const screenshots = await ProcessRunner.executeServerCapture(processId);
    
    return NextResponse.json({ 
      success: true, 
      screenshots: screenshots.length,
      message: `Server capture completed with ${screenshots.length} screenshots`
    });
    
  } catch (error) {
    console.error('Error in server capture:', error);
    return NextResponse.json(
      { error: 'Failed to execute server capture: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 