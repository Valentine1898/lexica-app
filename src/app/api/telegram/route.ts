import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, initDb } from '@/lib/db';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

function frequencyBadge(rank: number): string {
  if (rank <= 1000) return '🔥 Very Common';
  if (rank <= 3000) return '📈 Common';
  if (rank <= 8000) return '📊 Moderate';
  if (rank <= 15000) return '📉 Uncommon';
  return '❄️ Rare';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId: number = message.chat?.id;
    const text: string | undefined = message.text;

    // Ignore non-text messages
    if (!text) return NextResponse.json({ ok: true });

    const trimmed = text.trim();

    // Handle /start and /login commands
    if (trimmed === '/start' || trimmed === '/login') {
      const telegramUserId = message.from?.id;
      const firstName = message.from?.first_name || 'User';
      const username = message.from?.username || null;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://anki-app-seven.vercel.app';
      
      const tokenRes = await fetch(`${appUrl}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramUserId, first_name: firstName, username })
      });
      const tokenData = await tokenRes.json();
      const loginUrl = `${appUrl}/api/auth/verify?token=${tokenData.token}`;
      await sendMessage(chatId, `👋 Hi ${firstName}!\n\nClick to open Lexica:\n<a href="${loginUrl}">🔗 Login to Lexica</a>\n\n<i>Link expires in 5 minutes</i>`);
      return NextResponse.json({ ok: true });
    }

    // Only handle single English words (no spaces, only letters)
    if (!/^[a-zA-Z]+$/.test(trimmed)) {
      return NextResponse.json({ ok: true });
    }

    // Get (or create) the app user record so we can scope words correctly
    await initDb();
    const telegramUserId = message.from?.id;
    const firstName = message.from?.first_name || 'User';
    const username = message.from?.username || null;
    if (!telegramUserId) return NextResponse.json({ ok: true });
    const appUserId = await getOrCreateUser(telegramUserId, firstName, username);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${appUrl}/api/words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: trimmed, app_user_id: appUserId }),
    });

    const data = await res.json();

    if (res.status === 409) {
      await sendMessage(chatId, `<b>${trimmed}</b> is already in your vocabulary list.`);
    } else if (res.status === 404 || (res.status !== 201 && data.error?.includes('not found'))) {
      await sendMessage(chatId, `Word "<b>${trimmed}</b>" was not found in the dictionary.`);
    } else if (res.status === 201) {
      const { word, phonetic, definition, frequencyRank, examples, ukrainianTranslation } = data;
      const badge = frequencyBadge(frequencyRank);

      let reply = `<b>${word}</b>`;
      if (phonetic) reply += `  <i>${phonetic}</i>`;
      if (ukrainianTranslation) reply += `\n🇺🇦 <b>${ukrainianTranslation}</b>`;
      reply += `\n${badge}\n\n${definition}`;

      if (examples && examples.length > 0) {
        reply += '\n\n<b>Examples:</b>';
        for (const ex of examples) {
          reply += `\n• ${ex}`;
        }
      }

      await sendMessage(chatId, reply);
    } else {
      await sendMessage(chatId, `Failed to add word: ${data.error || 'Unknown error'}`);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
