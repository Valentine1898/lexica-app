import { insertWord, insertReview, getDb } from './db';

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
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=uk&dt=t&q=${encodeURIComponent(word)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.[0]?.[0] || null;
  } catch { return null; }
}

export interface AddWordResult {
  word: string;
  status: 'added' | 'duplicate' | 'not_found' | 'error';
  phonetic?: string | null;
  definition?: string;
  partOfSpeech?: string | null;
  frequencyRank?: number;
  examples?: string[];
  ukrainianTranslation?: string | null;
}

export async function addWordForUser(word: string, userId: number): Promise<AddWordResult> {
  const normalizedWord = word.trim().toLowerCase();

  const db = getDb();
  const existing = await db.execute({
    sql: 'SELECT id FROM words WHERE word = ? AND user_id = ?',
    args: [normalizedWord, userId],
  });
  if (existing.rows.length > 0) return { word: normalizedWord, status: 'duplicate' };

  try {
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
    return {
      word: normalizedWord,
      status: 'added',
      phonetic: dictData.phonetic,
      definition: dictData.definition,
      partOfSpeech: dictData.partOfSpeech,
      frequencyRank,
      examples: dictData.examples,
      ukrainianTranslation: translation,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { word: normalizedWord, status: message.includes('not found') ? 'not_found' : 'error' };
  }
}

// Extract all English words from arbitrary text, ignoring translations/other languages.
// Returns deduplicated lowercase words, max 20.
export function extractEnglishWords(text: string): string[] {
  const tokens = text.split(/[^a-zA-Z]+/);
  const seen = new Set<string>();
  const words: string[] = [];
  for (const token of tokens) {
    const w = token.toLowerCase();
    if (w.length >= 2 && !seen.has(w)) {
      seen.add(w);
      words.push(w);
    }
    if (words.length >= 20) break;
  }
  return words;
}
