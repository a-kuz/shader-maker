import { NextRequest, NextResponse } from 'next/server';
import { getAllProcesses } from '@/lib/db';

let cache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 5000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeSteps = searchParams.get('includeSteps') === 'true';
    
    const cacheKey = `${page}-${limit}-${includeSteps}`;
    const now = Date.now();
    
    if (cache && cache.timestamp > now - CACHE_DURATION && page === 1) {
      return NextResponse.json(cache.data, {
        headers: {
          'Cache-Control': 'public, max-age=5, stale-while-revalidate=10'
        }
      });
    }
    
    const { processes, total } = getAllProcesses({
      page,
      limit,
      includeSteps
    });
    
    const responseData = { 
      processes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
    
    if (page === 1) {
      cache = { data: responseData, timestamp: now };
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=5, stale-while-revalidate=10'
      }
    });
  } catch (error) {
    console.error('Error fetching processes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processes' },
      { status: 500 }
    );
  }
} 