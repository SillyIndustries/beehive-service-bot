import { Dispatcher, filters } from '@mtcute/dispatcher';
import { env } from '../../env.js';

export const beehiveDp = Dispatcher.child();

beehiveDp.onNewMessage(
  filters.chatId(env.TELEGRAM_SELF_CHANNEL),

  async (message) => {
    // just have a damn signature on
    if (!message.signature)
      await message.delete();
  }
)