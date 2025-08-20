import { NextResponse } from 'next/server';
import { getPromptHistory, getPromptById, deletePrompt } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (id) {
      const entry = getPromptById(id);
      
      if (!entry) {
        return NextResponse.json(
          { error: 'Prompt not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(entry);
    }
    
    const limit = parseInt(url.searchParams.get('limit') || '150');
    const history = getPromptHistory(limit);
    
    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching prompt history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const deleted = deletePrompt(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
} 