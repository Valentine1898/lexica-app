import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, initDb } from '@/lib/db';
import { addWordForUser, extractEnglishWords } from '@/lib/addWord';

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
    if (!text) return NextResponse.json({ ok: true });

    const trimmed = text.trim();

    // Handle commands
    if (trimmed === '/start' || trimmed === '/login') {
      const telegramUserId = message.from?.id;
      const firstName = message.from?.first_name || 'User';
      const username = message.from?.username || null;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://anki-app-seven.vercel.app';

      const tokenRes = await fetch(`${appUrl}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramUserId, first_name: firstName, username }),
      });
      const tokenData = await tokenRes.json();
      const loginUrl = `${appUrl}/api/auth/verify?token=${tokenData.token}`;
      await sendMessage(chatId, `👋 Hi ${firstName}!\n\nClick to open Lexica:\n<a href="${loginUrl}">🔗 Login to Lexica</a>\n\n<i>Link expires in 5 minutes</i>`);
      return NextResponse.json({ ok: true });
    }

    // Extract English words from whatever the user sent
    const words = extractEnglishWords(trimmed);
    if (words.length === 0) return NextResponse.json({ ok: true });

    // Get (or create) app user
    await initDb();
    const telegramUserId = message.from?.id;
    const firstName = message.from?.first_name || 'User';
    const username = message.from?.username || null;
    if (!telegramUserId) return NextResponse.json({ ok: true });
    const appUserId = await getOrCreateUser(telegramUserId, firstName, username);

    // Single word → detailed response
    if (words.length === 1) {
      const result = await addWordForUser(words[0], appUserId);

      if (result.status === 'duplicate') {
        await sendMessage(chatId, `<b>${words[0]}</b> is already in your vocabulary list.`);
      } else if (result.status === 'not_found') {
        await sendMessage(chatId, `Word "<b>${words[0]}</b>" was not found in the dictionary.`);
      } else if (result.status === 'added') {
        const { word, phonetic, ukrainianTranslation, frequencyRank, definition, examples } = result;
        let reply = `<b>${word}</b>`;
        if (phonetic) reply += `  <i>${phonetic}</i>`;
        if (ukrainianTranslation) reply += `\n🇺🇦 <b>${ukrainianTranslation}</b>`;
        if (frequencyRank) reply += `\n${frequencyBadge(frequencyRank)}`;
        reply += `\n\n${definition}`;
        if (examples?.length) {
          reply += '\n\n<b>Examples:</b>';
          for (const ex of examples) reply += `\n• ${ex}`;
        }
        await sendMessage(chatId, reply);
      } else {
        await sendMessage(chatId, `Failed to add <b>${words[0]}</b>.`);
      }
      return NextResponse.json({ ok: true });
    }

    // Multiple words → add all in parallel, send summary
    const results = await Promise.all(words.map(w => addWordForUser(w, appUserId)));

    const added = results.filter(r => r.status === 'added');
    const duplicates = results.filter(r => r.status === 'duplicate');
    const notFound = results.filter(r => r.status === 'not_found');

    let reply = '';

    if (added.length > 0) {
      reply += `✅ <b>Added ${added.length} word${added.length > 1 ? 's' : ''}:</b>\n`;
      for (const r of added) {
        reply += `• <b>${r.word}</b>`;
        if (r.ukrainianTranslation) reply += ` — ${r.ukrainianTranslation}`;
        reply += '\n';
      }
    }

    if (duplicates.length > 0) {
      if (reply) reply += '\n';
      reply += `⚠️ Already in vocab: ${duplicates.map(r => r.word).join(', ')}`;
    }

    if (notFound.length > 0) {
      if (reply) reply += '\n';
      reply += `❌ Not found: ${notFound.map(r => r.word).join(', ')}`;
    }

    if (reply) await sendMessage(chatId, reply.trim());
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
