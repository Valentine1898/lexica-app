import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb, getOrCreateUser } from '@/lib/db';
import { SignJWT } from 'jose';

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const token = request.nextUrl.searchParams.get('token');
    if (!token) return NextResponse.redirect(new URL('/login?error=missing', request.url));
    
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM login_tokens WHERE token = ?',
      args: [token]
    });
    
    if (!result.rows.length) return NextResponse.redirect(new URL('/login?error=invalid', request.url));
    
    const row = result.rows[0] as any;
    const now = Math.floor(Date.now() / 1000);
    if (Number(row.expires_at) < now) {
      await db.execute({ sql: 'DELETE FROM login_tokens WHERE token = ?', args: [token] });
      return NextResponse.redirect(new URL('/login?error=expired', request.url));
    }
    
    // DON'T delete token - allow multiple uses within expiry window
    // This fixes Telegram link preview consuming the token
    
    const userId = await getOrCreateUser(Number(row.telegram_id), row.first_name, row.username);
    
    const jwtSecret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
    const jwtToken = await new SignJWT({ userId, telegramId: Number(row.telegram_id), firstName: row.first_name, username: row.username || null })
      .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('30d').sign(jwtSecret);
    
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('vocab_session', jwtToken, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 2592000, path: '/' });
    return response;
  } catch (e) {
    console.error('Verify error:', e);
    return NextResponse.redirect(new URL('/login?error=server', request.url));
  }
}