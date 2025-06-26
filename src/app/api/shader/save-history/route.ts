import { NextResponse } from 'next/server';
import { savePrompt } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, prompt, code, screenshots } = body;
    
    if (!id || !prompt || !code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    savePrompt({
      id,
      prompt,
      code,
      screenshots: screenshots || [],
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving prompt history:', error);
    return NextResponse.json(
      { error: 'Failed to save prompt history' },
      { status: 500 }
    );
  }
} 