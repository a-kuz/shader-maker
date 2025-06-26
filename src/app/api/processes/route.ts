import { NextRequest, NextResponse } from 'next/server';
import { getAllProcesses } from '@/lib/db';

export async function GET() {
  try {
    const processes = getAllProcesses();
    
    return NextResponse.json({ 
      processes,
      total: processes.length
    });
  } catch (error) {
    console.error('Error fetching processes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processes' },
      { status: 500 }
    );
  }
} 