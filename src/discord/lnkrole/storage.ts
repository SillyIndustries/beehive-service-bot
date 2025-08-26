import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../database/index.js';
import { discordTokens, linkedUsers } from '../../database/schema.js';
import { Tokens } from './types.js';
import { revokeOAuth2 } from './general.js';
import { tg, utg } from '../../telegram/client.js';
import { initializeFolder, updateExportLink } from '../../telegram/folder.js';
import { tryToResolveChanPeer } from '../../telegram/folder.js';

export async function storeDiscordTokens(userId: string, tokens: Tokens) {
  return await db.insert(discordTokens)
    .values({
      discord_id: userId,
      ...tokens,
    })
    .onConflictDoUpdate({
      target: discordTokens.discord_id,
      set: {
        ...tokens,
      },
    });
}

export async function getDiscordAccessTokenCached(userId: string) {
  const [row] = await db.select()
    .from(discordTokens)
    .where(eq(discordTokens.discord_id, userId))
    .limit(1);

  if (!row) throw new Error;

  return row;
}

export async function updateDiscordTokens(userId: string, tokens: Tokens) {
  return await db.update(discordTokens)
    .set(tokens)
    .where(eq(discordTokens.discord_id, userId));
}

export async function associateDiscordWithTelegram(
  discordId: string,
  telegramId: number,
  telegramChat: number
) {
  const [ existing ] = await db.select()
    .from(linkedUsers)
    .where(eq(linkedUsers.telegram_chat, telegramChat));

  if (!existing) {
    try {
      const peer = await tryToResolveChanPeer((await tg.getChat(telegramChat)).username);

      const folder = await initializeFolder();
      const data = await utg.findFolder({ id: folder });
      if (!data) throw new Error('folder not found');

      await utg.editFolder({
        folder: data,
        modification: {
          includePeers: [ ...(data?.includePeers ?? []), peer ],
        }
      });
      await updateExportLink();
    } catch (err) {
      console.error('Error adding new chat to folder:', err);
    }
  }

  return await db.insert(linkedUsers)
    .values({
      discord_id: discordId,
      telegram_id: telegramId,
      telegram_chat: telegramChat,
    })
    .onConflictDoUpdate({
      target: [linkedUsers.discord_id, linkedUsers.telegram_id],
      set: {
        telegram_chat: telegramChat,
      },
    });
}

export async function getAllDiscordIdsForTelegramChat(telegramChat: number) {
  const rows = await db.select()
    .from(linkedUsers)
    .where(eq(linkedUsers.telegram_chat, telegramChat));

  return rows.map(r => r.discord_id);
}

export async function removeAllAssociationsForTelegram(telegramChat: number, telegramId: number) {
  const [ row ] = await db.select()
    .from(linkedUsers)
    .where(and(
      eq(linkedUsers.telegram_id, telegramId),
      eq(linkedUsers.telegram_chat, telegramChat)
    ));
  if (!row) return 0;

  await revokeOAuth2(row.discord_id);
  await removeDiscordTokens(row.discord_id);

  await db.delete(linkedUsers)
    .where(eq(linkedUsers.telegram_id, telegramId));

  await updateFolder(telegramChat);
}

export async function removeAllAssociationsForDiscord(discordId: string) {
  await revokeOAuth2(discordId);
  await removeDiscordTokens(discordId);

  const [ row ] = await db.select()
    .from(linkedUsers)
    .where(eq(linkedUsers.discord_id, discordId));

  await db.delete(linkedUsers)
    .where(eq(linkedUsers.discord_id, discordId));

  await updateFolder(row.telegram_chat);
}

async function updateFolder(telegramChat: number) {
  // check if chat still exists in db
  const rows = await db.select({
    count: sql<number>`count(*)`,
  })
    .from(linkedUsers)
    .where(eq(linkedUsers.telegram_chat, telegramChat))

  if (rows[0].count > 0)
    return;

  const folder = await initializeFolder();
  const data = await utg.findFolder({ id: folder });
  if (!data) throw new Error('folder not found');
  await utg.editFolder({
    folder: data,
    modification: {
      includePeers: data?.includePeers.filter(p =>
        p._ !== 'inputPeerChannel' || (p.channelId !== telegramChat)
      ),
    }
  });

  await utg.leaveChat(telegramChat);
  await updateExportLink();
}

export async function removeAllAssociationsForTelegramChat(telegramChat: number) {
  const rows = await db.select()
    .from(linkedUsers)
    .where(eq(linkedUsers.telegram_chat, telegramChat));

  for (const row of rows) {
    await revokeOAuth2(row.discord_id);
    await removeDiscordTokens(row.discord_id);
  }

  await db.delete(linkedUsers)
    .where(eq(linkedUsers.telegram_chat, telegramChat));
  await updateFolder(telegramChat);
}

export async function removeDiscordTokens(userId: string) {
  return await db.delete(discordTokens)
    .where(eq(discordTokens.discord_id, userId));
}