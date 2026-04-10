import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function getUserIdFromRequest(request: NextRequest): Promise<number | null> {
  const cookie = request.cookies.get('vocab_session');
  if (!cookie?.value) return null;
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
    const { payload } = await jwtVerify(cookie.value, secret);
    return typeof payload.userId === 'number' ? payload.userId : null;
  } catch {
    return null;
  }
}
