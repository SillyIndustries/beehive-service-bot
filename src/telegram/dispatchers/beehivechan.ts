import { Dispatcher, filters } from '@mtcute/dispatcher';
import { env } from '../../env.js';

export const beehiveDp = Dispatcher.child();

beehiveDp.onNewMessage(
  filters.and(filters.chatId(env.TELEGRAM_SELF_CHANNEL), filters.not(filters.service)),

  async (message) => {
    // just have a damn signature on
    if (!message.signature)
      await message.delete();
  }
)