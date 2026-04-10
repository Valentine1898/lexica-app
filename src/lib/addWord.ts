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

export interface WordEntry {
  english: string;
  translation?: string;
}

export interface AddWordResult {
  word: string;
  status: 'added' | 'duplicate' | 'not_found' | 'error';
  phonetic?: string | null;
  definition?: string | null;
  partOfSpeech?: string | null;
  frequencyRank?: number;
  examples?: string[];
  ukrainianTranslation?: string | null;
}

// Parse text in "english — translation" format, extracting phrases and words.
// Falls back to individual word extraction if no dash pattern found.
export function parseVocabText(text: string): WordEntry[] {
  const lines = text.split('\n');
  const results: WordEntry[] = [];
  const seen = new Set<string>();

  const hasDashFormat = lines.some(l => /[—–]/.test(l));

  if (hasDashFormat) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '---') continue;

      // Match "english words/phrase — translation"
      const match = trimmed.match(/^([a-zA-Z][a-zA-Z\s]*)[\s]*[—–][\s]*(.+)$/);
      if (match) {
        const english = match[1].trim().toLowerCase().replace(/\s+/g, ' ');
        const translation = match[2].trim();
        if (english.length >= 2 && !seen.has(english)) {
          seen.add(english);
          results.push({ english, translation });
          if (results.length >= 30) break;
        }
      }
    }
    if (results.length > 0) return results;
  }

  // Fallback: extract individual English words (letters only, min length 2)
  const tokens = text.split(/[^a-zA-Z]+/);
  for (const token of tokens) {
    const w = token.toLowerCase();
    if (w.length >= 2 && !seen.has(w)) {
      seen.add(w);
      results.push({ english: w });
      if (results.length >= 20) break;
    }
  }
  return results;
}

export async function addWordForUser(
  english: string,
  userId: number,
  providedTranslation?: string
): Promise<AddWordResult> {
  const normalized = english.trim().toLowerCase().replace(/\s+/g, ' ');
  const isPhrase = normalized.includes(' ');

  const db = getDb();
  const existing = await db.execute({
    sql: 'SELECT id FROM words WHERE word = ? AND user_id = ?',
    args: [normalized, userId],
  });
  if (existing.rows.length > 0) return { word: normalized, status: 'duplicate' };

  let phonetic: string | null = null;
  let audioUrl: string | null = null;
  let definition: string | null = null;
  let partOfSpeech: string | null = null;
  let examples: string[] = [];
  let translation: string | null = providedTranslation ?? null;

  if (isPhrase) {
    // Phrases: skip dictionary API, use provided translation
    // If no translation provided, try to fetch one
    if (!translation) translation = await fetchTranslation(normalized).catch(() => null);
  } else {
    // Single word: full dictionary lookup
    try {
      const [dictData, fetchedTranslation] = await Promise.all([
        fetchDictionaryData(normalized),
        translation ? Promise.resolve(null) : fetchTranslation(normalized),
      ]);
      phonetic = dictData.phonetic;
      audioUrl = dictData.audioUrl;
      definition = dictData.definition;
      partOfSpeech = dictData.partOfSpeech;
      examples = dictData.examples;
      if (!translation) translation = fetchedTranslation;
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      return { word: normalized, status: message.includes('not found') ? 'not_found' : 'error' };
    }
  }

  const frequencyRank = Math.floor(Math.random() * 15000) + 1;
  const wordId = await insertWord({
    word: normalized,
    user_id: userId,
    phonetic,
    audio_url: audioUrl,
    definition,
    part_of_speech: partOfSpeech,
    frequency_rank: frequencyRank,
    examples: JSON.stringify(examples),
    ukrainian_translation: translation,
  });
  const today = new Date().toISOString().split('T')[0];
  await insertReview(wordId, today);

  return {
    word: normalized,
    status: 'added',
    phonetic,
    definition,
    partOfSpeech,
    frequencyRank,
    examples,
    ukrainianTranslation: translation,
  };
}
