import { NextRequest, NextResponse } from 'next/server';
import { ProcessRunner } from '@/lib/processRunner';
import { getProcess, getProcessUpdates, deleteProcess } from '@/lib/db';
import { ProcessStatusResponse, ProcessControlRequest } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    
    const process = getProcess(id);
    if (!process) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    const updates = getProcessUpdates(
      id, 
      since ? new Date(since) : undefined
    );

    const response: ProcessStatusResponse = {
      process,
      updates
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching process:', error);
    return NextResponse.json(
      { error: 'Failed to fetch process' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🎛️ PROCESS CONTROL ENDPOINT HIT!');
  try {
    const { id } = await params;
    const body: ProcessControlRequest = await request.json();
    const { action } = body;

    let success = false;
    let message = '';

    switch (action) {
      case 'pause':
        success = ProcessRunner.pauseProcess(id);
        message = success ? 'Process paused' : 'Failed to pause process';
        break;
        
      case 'resume':
        success = ProcessRunner.resumeProcess(id);
        message = success ? 'Process resumed' : 'Failed to resume process';
        break;
        
      case 'stop':
        success = ProcessRunner.stopProcess(id);
        message = success ? 'Process stopped' : 'Failed to stop process';
        break;
        
      case 'retry':
        // Restart the process from the beginning
        success = ProcessRunner.resumeProcess(id);
        message = success ? 'Process restarted' : 'Failed to restart process';
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (!success) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message,
      process: getProcess(id)
    });
  } catch (error) {
    console.error('Error controlling process:', error);
    return NextResponse.json(
      { error: 'Failed to control process' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Stop the process first if it's running
    ProcessRunner.stopProcess(id);
    
    // Delete from database
    const deleted = deleteProcess(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting process:', error);
    return NextResponse.json(
      { error: 'Failed to delete process' },
      { status: 500 }
    );
  }
} 