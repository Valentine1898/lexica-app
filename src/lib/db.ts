import { createClient } from '@libsql/client';

const TURSO_URL = process.env.TURSO_DATABASE_URL!;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  }
  return client;
}

export async function initDb() {
  const db = getDb();

  // Users table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      username TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Login tokens table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS login_tokens (
      token TEXT PRIMARY KEY,
      telegram_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      username TEXT,
      expires_at INTEGER NOT NULL
    )
  `);

  // Migrate words table to support per-user unique words
  const wordsTable = await db.execute(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='words'"
  );

  if (wordsTable.rows.length === 0) {
    // Fresh install — correct schema from the start
    await db.execute(`
      CREATE TABLE words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        phonetic TEXT,
        audio_url TEXT,
        ukrainian_translation TEXT,
        definition TEXT,
        part_of_speech TEXT,
        frequency_rank INTEGER,
        examples TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(word, user_id)
      )
    `);
  } else {
    const currentSql = (wordsTable.rows[0] as any).sql as string;
    const hasCorrectUnique = /unique\s*\(\s*word\s*,\s*user_id\s*\)/i.test(currentSql);

    if (!hasCorrectUnique) {
      // Recreate table with correct UNIQUE(word, user_id) constraint.
      // Old data may have stored telegram_id as user_id — JOIN users to remap correctly.
      const hasUserId = /\buser_id\b/i.test(currentSql);
      const insertSql = hasUserId
        ? `INSERT OR IGNORE INTO words_new (id, word, user_id, phonetic, audio_url, ukrainian_translation, definition, part_of_speech, frequency_rank, examples, created_at)
           SELECT w.id, w.word, u.id, w.phonetic, w.audio_url, w.ukrainian_translation, w.definition, w.part_of_speech, w.frequency_rank, w.examples, w.created_at
           FROM words w LEFT JOIN users u ON u.telegram_id = w.user_id`
        : `INSERT OR IGNORE INTO words_new (id, word, user_id, phonetic, audio_url, ukrainian_translation, definition, part_of_speech, frequency_rank, examples, created_at)
           SELECT id, word, NULL, phonetic, audio_url, ukrainian_translation, definition, part_of_speech, frequency_rank, examples, created_at FROM words`;

      await db.batch([
        {
          sql: `CREATE TABLE words_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            user_id INTEGER REFERENCES users(id),
            phonetic TEXT,
            audio_url TEXT,
            ukrainian_translation TEXT,
            definition TEXT,
            part_of_speech TEXT,
            frequency_rank INTEGER,
            examples TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(word, user_id)
          )`,
          args: [],
        },
        { sql: insertSql, args: [] },
        { sql: 'DROP TABLE words', args: [] },
        { sql: 'ALTER TABLE words_new RENAME TO words', args: [] },
      ]);
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 1,
      due_date TEXT NOT NULL,
      repetitions INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_reviews_word_id ON reviews(word_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_reviews_due_date ON reviews(due_date)`);
}

export interface WordRow {
  id: number;
  word: string;
  user_id?: number | null;
  phonetic: string | null;
  audio_url: string | null;
  ukrainian_translation: string | null;
  definition: string | null;
  part_of_speech: string | null;
  frequency_rank: number | null;
  examples: string | null;
  created_at: string;
}

export interface WordWithReview extends WordRow {
  review_id: number;
  ease_factor: number;
  interval_days: number;
  due_date: string;
  repetitions: number;
  updated_at: string;
}

export interface DashboardStats {
  dueToday: number;
  reviewedToday: number;
  streak: number;
  totalWords: number;
}

export async function getAllWords(userId: number): Promise<WordWithReview[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT w.*, r.id as review_id, r.ease_factor, r.interval_days, r.due_date, r.repetitions, r.updated_at
          FROM words w LEFT JOIN reviews r ON r.word_id = w.id
          WHERE w.user_id = ?
          ORDER BY w.created_at DESC`,
    args: [userId],
  });
  return result.rows as unknown as WordWithReview[];
}

export async function getWordById(id: number): Promise<WordWithReview | undefined> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT w.*, r.id as review_id, r.ease_factor, r.interval_days, r.due_date, r.repetitions, r.updated_at
          FROM words w LEFT JOIN reviews r ON r.word_id = w.id WHERE w.id = ?`,
    args: [id],
  });
  return result.rows[0] as unknown as WordWithReview | undefined;
}

export async function getDueWords(userId: number): Promise<WordWithReview[]> {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const result = await db.execute({
    sql: `SELECT w.*, r.id as review_id, r.ease_factor, r.interval_days, r.due_date, r.repetitions, r.updated_at
          FROM words w JOIN reviews r ON r.word_id = w.id
          WHERE r.due_date <= ? AND w.user_id = ?
          ORDER BY r.due_date ASC`,
    args: [today, userId],
  });
  return result.rows as unknown as WordWithReview[];
}

export async function insertWord(word: Omit<WordRow, 'id' | 'created_at'>): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO words (word, user_id, phonetic, audio_url, definition, part_of_speech, frequency_rank, examples, ukrainian_translation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      word.word,
      word.user_id ?? null,
      word.phonetic,
      word.audio_url,
      word.definition,
      word.part_of_speech,
      word.frequency_rank,
      word.examples,
      word.ukrainian_translation ?? null,
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function insertReview(wordId: number, dueDate: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO reviews (word_id, ease_factor, interval_days, due_date, repetitions, updated_at)
          VALUES (?, 2.5, 1, ?, 0, datetime('now'))`,
    args: [wordId, dueDate],
  });
}

export async function updateReview(
  reviewId: number,
  easeFactor: number,
  intervalDays: number,
  dueDate: string,
  repetitions: number
): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE reviews SET ease_factor = ?, interval_days = ?, due_date = ?, repetitions = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [easeFactor, intervalDays, dueDate, repetitions, reviewId],
  });
}

export async function deleteWord(id: number, userId: number): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'DELETE FROM words WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  return result.rowsAffected > 0;
}

export async function getDashboardStats(userId: number): Promise<DashboardStats> {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const [due, reviewed, total, streakRows] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as count FROM reviews r
            JOIN words w ON w.id = r.word_id
            WHERE r.due_date <= ? AND w.user_id = ?`,
      args: [today, userId],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM reviews r
            JOIN words w ON w.id = r.word_id
            WHERE date(r.updated_at) = ? AND w.user_id = ?`,
      args: [today, userId],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM words WHERE user_id = ?`,
      args: [userId],
    }),
    db.execute({
      sql: `SELECT DISTINCT date(r.updated_at) as review_date
            FROM reviews r JOIN words w ON w.id = r.word_id
            WHERE date(r.updated_at) <= ? AND w.user_id = ?
            ORDER BY review_date DESC LIMIT 365`,
      args: [today, userId],
    }),
  ]);

  let streak = 0;
  const currentDate = new Date(today);
  for (const row of streakRows.rows as unknown as { review_date: string }[]) {
    const diffDays = Math.round(
      (currentDate.getTime() - new Date(row.review_date).getTime()) / 86400000
    );
    if (diffDays === streak) streak++;
    else break;
  }

  return {
    dueToday: Number((due.rows[0] as any).count),
    reviewedToday: Number((reviewed.rows[0] as any).count),
    streak,
    totalWords: Number((total.rows[0] as any).count),
  };
}

export async function getOrCreateUser(
  telegramId: number,
  firstName: string,
  username: string | null
): Promise<number> {
  const db = getDb();
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE telegram_id = ?',
    args: [telegramId],
  });
  if (existing.rows.length > 0) return Number((existing.rows[0] as any).id);
  const result = await db.execute({
    sql: "INSERT INTO users (telegram_id, first_name, username, created_at) VALUES (?, ?, ?, datetime('now'))",
    args: [telegramId, firstName, username ?? null],
  });
  return Number(result.lastInsertRowid);
}

export async function getUserByTelegramId(
  telegramId: number
): Promise<{ id: number; telegram_id: number; first_name: string; username: string | null } | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE telegram_id = ?',
    args: [telegramId],
  });
  return result.rows.length > 0 ? (result.rows[0] as any) : null;
}
