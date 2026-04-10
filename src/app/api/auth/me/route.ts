import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('vocab_session')?.value;
    if (!token) return NextResponse.json({ user: null });
    const jwtSecret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
    const { payload } = await jwtVerify(token, jwtSecret);
    return NextResponse.json({ user: payload });
  } catch {
    return NextResponse.json({ user: null });
  }
}