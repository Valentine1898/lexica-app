import { NextRequest, NextResponse } from 'next/server';
import { getAllWords, insertWord, insertReview, getDb, initDb } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

interface DictionaryPhonetic { text?: string; audio?: string; }
interface DictionaryDefinition { definition: string; example?: string; }
interface DictionaryMeaning { partOfSpeech: string; definitions: DictionaryDefinition[]; }
interface DictionaryEntry { word: string; phonetic?: string; phonetics?: DictionaryPhonetic[]; meanings: DictionaryMeaning[]; }

async function fetchDictionaryData(word: string) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 404 ? `Word "${word}" not found` : `Dictionary API error: ${res.status}`);
  const entries: DictionaryEntry[] = await res.json();
  const entry = entries[0];
  let phonetic: string | null = entry.phonetic || null;
  let audioUrl: string | null = null;
  if (entry.phonetics?.length) {
    const pt = entry.phonetics.find(p => p.text);
    if (pt?.text) phonetic = pt.text;
    const pa = entry.phonetics.find(p => p.audio?.trim());
    if (pa?.audio) audioUrl = pa.audio.startsWith('//') ? 'https:' + pa.audio : pa.audio;
  }
  let definition = '', partOfSpeech: string | null = null;
  const examples: string[] = [];
  for (const meaning of entry.meanings) {
    if (!partOfSpeech) partOfSpeech = meaning.partOfSpeech;
    for (const def of meaning.definitions) {
      if (!definition) definition = def.definition;
      if (def.example && examples.length < 3) examples.push(def.example);
      if (definition && examples.length >= 3) break;
    }
    if (definition && examples.length >= 3) break;
  }
  if (!definition) throw new Error('No definition found');
  return { phonetic, audioUrl, definition, partOfSpeech, examples };
}

async function fetchTranslation(word: string): Promise<string | null> {
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=uk&dt=t&q=${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.[0]?.[0] || null;
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const words = await getAllWords(userId);
    return NextResponse.json(words);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDb();

    // Support both JWT-authenticated web requests and internal bot calls
    const body = await request.json();
    const { word } = body;

    let userId: number | null = null;
    // Internal bot requests pass app_user_id directly (server-to-server)
    if (typeof body.app_user_id === 'number') {
      userId = body.app_user_id;
    } else {
      userId = await getUserIdFromRequest(request);
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!word || typeof word !== 'string') return NextResponse.json({ error: 'Word is required' }, { status: 400 });

    const normalizedWord = word.trim().toLowerCase();
    if (!normalizedWord || normalizedWord.length > 100) return NextResponse.json({ error: 'Invalid word' }, { status: 400 });

    const db = getDb();
    const existing = await db.execute({
      sql: 'SELECT id FROM words WHERE word = ? AND user_id = ?',
      args: [normalizedWord, userId],
    });
    if (existing.rows.length > 0) return NextResponse.json({ error: `"${normalizedWord}" already exists` }, { status: 409 });

    const [dictData, translation] = await Promise.all([
      fetchDictionaryData(normalizedWord),
      fetchTranslation(normalizedWord),
    ]);
    const frequencyRank = Math.floor(Math.random() * 15000) + 1;
    const wordId = await insertWord({
      word: normalizedWord,
      user_id: userId,
      phonetic: dictData.phonetic,
      audio_url: dictData.audioUrl,
      definition: dictData.definition,
      part_of_speech: dictData.partOfSpeech,
      frequency_rank: frequencyRank,
      examples: JSON.stringify(dictData.examples),
      ukrainian_translation: translation,
    });
    const today = new Date().toISOString().split('T')[0];
    await insertReview(wordId, today);
    return NextResponse.json({
      id: wordId, word: normalizedWord, phonetic: dictData.phonetic,
      definition: dictData.definition, partOfSpeech: dictData.partOfSpeech,
      frequencyRank, examples: dictData.examples, ukrainianTranslation: translation,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add word';
    return NextResponse.json({ error: message }, { status: message.includes('not found') ? 404 : 500 });
  }
}
