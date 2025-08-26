import { Dispatcher, filters, PropagationAction } from '@mtcute/dispatcher';
import { InputMedia } from '@mtcute/node';
import { redis, VERIFICATION_HASH_KEY_PREFIX } from '../../redis/index.js';
import { verificationScene } from './scenes/verification.js';

export const startDp = Dispatcher.child<object>();

startDp.onNewMessage(filters.start, async (msg, state) => {
  await msg.replyMedia(InputMedia.sticker('CAACAgEAAxkBAAEPPOVorKc26l1srwvigic6aaAtvWKwbgACBAUAArqHuUVC7kmH47YQ5zYE'));

  const match = msg.text.slice('/start '.length);
  console.log(match);

  const hKey = VERIFICATION_HASH_KEY_PREFIX + match;
  const exists = await redis.exists(hKey);
  if (exists) {
    await state.set({
      telegram_user: msg.chat.id,
      ...await redis.hGetAll(hKey)
    });
    await redis.del(hKey);
    await state.enter(verificationScene);
    return PropagationAction.ToScene;
  }
});