import { TelegramClient } from '@mtcute/node';

import { env } from '../env.js'
import { hook } from './dispatchers/index.js';
import { initializeFolder, updateExportLink } from './folder.js';

export const tg = new TelegramClient({
  apiId: +env.API_ID,
  apiHash: env.API_HASH,
  storage: 'bot-data/session',
});

export const utg = new TelegramClient({
  apiId: +env.API_ID,
  apiHash: env.API_HASH,
  storage: 'user-data/session',
});

hook(tg);

export async function start() {
  const user = await tg.start({ botToken: env.BOT_TOKEN });
  console.log('Telegram: Logged in as', user.username);
}

export async function ustart() {
  const self = await utg.start({
    phone: () => utg.input('Phone > '),
    code: () => utg.input('Code > '),
    password: () => utg.input('Password > ')
  });
  console.log(`Logged in as ${self.displayName}`);

  await initializeFolder();
  await updateExportLink();
}