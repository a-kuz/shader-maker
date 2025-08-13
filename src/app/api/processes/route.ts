import { NextRequest, NextResponse } from 'next/server';
import { getAllProcesses } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeSteps = searchParams.get('includeSteps') === 'true';
    
    const { processes, total } = getAllProcesses({
      page,
      limit,
      includeSteps
    });
    
    return NextResponse.json({ 
      processes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching processes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processes' },
      { status: 500 }
    );
  }
} 