import { bigint, pgTable, varchar, primaryKey } from 'drizzle-orm/pg-core';

export const linkedUsers = pgTable('linked_users', {
  discord_id: varchar('discord_id').notNull(),
  telegram_id: bigint({ mode: 'number' }).notNull(),
  telegram_chat: bigint({ mode: 'number' }).notNull()
}, (t) => [
  primaryKey({ columns: [t.discord_id, t.telegram_id] }),
]);

export const discordTokens = pgTable('discord_tokens', {
  discord_id: varchar('discord_id').unique().notNull(),
  access_token: varchar('access_token').notNull(),
  refresh_token: varchar('refresh_token').notNull(),
  expires_at: bigint({ mode: 'number' }).notNull()
});

export const markovData = pgTable('markov_data', {
  state: varchar('state').notNull(),
  next: varchar('next').notNull(),
  count: bigint({ mode: 'number' }).notNull()
}, (t) => [
  primaryKey({ columns: [t.state, t.next] }),
]);