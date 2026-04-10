import { NextRequest, NextResponse } from 'next/server';
import { deleteWord, initDb } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await initDb();
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const deleted = await deleteWord(id, userId);
    if (!deleted) return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete word' }, { status: 500 });
  }
}
