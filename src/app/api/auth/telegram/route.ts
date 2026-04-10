import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { SignJWT } from 'jose';
import { getOrCreateUser, initDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const data = await request.json();
    const { hash, ...fields } = data;
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const checkString = Object.keys(fields).sort().map((k: string) => `${k}=${fields[k]}`).join('\n');
    const hmac = createHmac('sha256', secret).update(checkString).digest('hex');
    if (hmac !== hash) return NextResponse.json({ error: 'Invalid auth' }, { status: 401 });
    const authDate = parseInt(fields.auth_date);
    if (Date.now() / 1000 - authDate > 86400) return NextResponse.json({ error: 'Expired' }, { status: 401 });
    const userId = await getOrCreateUser(Number(fields.id), fields.first_name, fields.username || null);
    const jwtSecret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
    const token = await new SignJWT({ userId, telegramId: Number(fields.id), firstName: fields.first_name, username: fields.username || null })
      .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('30d').sign(jwtSecret);
    const response = NextResponse.json({ ok: true });
    response.cookies.set('vocab_session', token, { httpOnly: true, secure: true, maxAge: 2592000, path: '/' });
    return response;
  } catch (e) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}