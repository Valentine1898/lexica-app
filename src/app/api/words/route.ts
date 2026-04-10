import { NextRequest, NextResponse } from 'next/server';
import { getAllWords, initDb } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { addWordForUser } from '@/lib/addWord';

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const words = await getAllWords(userId);
    return NextResponse.json(words);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const body = await request.json();
    const { word } = body;

    let userId: number | null = null;
    if (typeof body.app_user_id === 'number') {
      userId = body.app_user_id;
    } else {
      userId = await getUserIdFromRequest(request);
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!word || typeof word !== 'string') return NextResponse.json({ error: 'Word is required' }, { status: 400 });

    const normalizedWord = word.trim().toLowerCase();
    if (!normalizedWord || normalizedWord.length > 100) {
      return NextResponse.json({ error: 'Invalid word' }, { status: 400 });
    }

    const result = await addWordForUser(normalizedWord, userId);

    if (result.status === 'duplicate') {
      return NextResponse.json({ error: `"${normalizedWord}" already exists` }, { status: 409 });
    }
    if (result.status === 'not_found') {
      return NextResponse.json({ error: `Word "${normalizedWord}" not found` }, { status: 404 });
    }
    if (result.status === 'error') {
      return NextResponse.json({ error: 'Failed to add word' }, { status: 500 });
    }

    return NextResponse.json({
      id: result.word, word: result.word, phonetic: result.phonetic,
      definition: result.definition, partOfSpeech: result.partOfSpeech,
      frequencyRank: result.frequencyRank, examples: result.examples,
      ukrainianTranslation: result.ukrainianTranslation,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add word';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
