import { TelegramClient } from '@mtcute/node';
import { Dispatcher, MemoryStateStorage } from '@mtcute/dispatcher';

import { startDp } from './start.js';
import { cMUDp } from './guh.js';

import { verificationScene } from './scenes/verification.js';

export function hook(tg: TelegramClient) {
  const dp = Dispatcher.for<object>(tg, {
    storage: new MemoryStateStorage()
  });

  dp.addScene(verificationScene);

  dp.extend(startDp);
  dp.extend(cMUDp);

  return dp;
}