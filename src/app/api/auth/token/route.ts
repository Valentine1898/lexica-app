import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const { telegram_id, first_name, username } = await request.json();
    
    const token = randomBytes(32).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 1800; // 30 min
    
    const db = getDb();
    await db.execute({
      sql: 'INSERT OR REPLACE INTO login_tokens (token, telegram_id, first_name, username, expires_at) VALUES (?, ?, ?, ?, ?)',
      args: [token, telegram_id, first_name, username || null, expiresAt]
    });
    
    return NextResponse.json({ token });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}