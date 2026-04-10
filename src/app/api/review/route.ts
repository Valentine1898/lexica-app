import { NextRequest, NextResponse } from 'next/server';
import { getDueWords, getDb, updateReview, initDb } from '@/lib/db';
import { calculateNextReview } from '@/lib/sm2';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const dueWords = await getDueWords(userId);
    return NextResponse.json(dueWords);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch review words' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { wordId, quality } = body;
    if (wordId === undefined || quality === undefined || quality < 0 || quality > 3) {
      return NextResponse.json({ error: 'wordId and quality (0-3) are required' }, { status: 400 });
    }

    const db = getDb();
    // Verify the word belongs to the current user
    const reviewResult = await db.execute({
      sql: `SELECT r.* FROM reviews r
            JOIN words w ON w.id = r.word_id
            WHERE r.word_id = ? AND w.user_id = ?`,
      args: [wordId, userId],
    });
    const review = reviewResult.rows[0] as any;
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    const result = calculateNextReview(review.ease_factor, review.interval_days, review.repetitions, quality);
    await updateReview(Number(review.id), result.easeFactor, result.intervalDays, result.dueDate, result.repetitions);
    return NextResponse.json({ wordId, ...result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
